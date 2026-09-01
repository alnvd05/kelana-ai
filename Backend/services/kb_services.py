import os
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlparse

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

load_dotenv()


class KnowledgeBaseConfigurationError(RuntimeError):
    """Raised when the Knowledge Base environment is incomplete."""


class KnowledgeBaseQueryError(RuntimeError):
    """Raised when Amazon Bedrock cannot return a grounded answer."""


@dataclass(frozen=True)
class KnowledgeSource:
    """A document referenced by a generated Knowledge Base answer."""

    name: str
    uri: str | None = None


@dataclass(frozen=True)
class KnowledgeBaseAnswer:
    """Grounded answer text and its deduplicated source documents."""

    text: str
    sources: tuple[KnowledgeSource, ...]


def _source_name(uri: str | None, metadata: dict[str, Any]) -> str | None:
    for key in ("file_name", "filename", "source", "title"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    if uri:
        path = unquote(urlparse(uri).path).rstrip("/")
        if path:
            return path.rsplit("/", maxsplit=1)[-1]

    return None


def _reference_uri(reference: dict[str, Any]) -> str | None:
    location = reference.get("location")
    if not isinstance(location, dict):
        location = {}

    for location_key, value_key in (
        ("s3Location", "uri"),
        ("webLocation", "url"),
        ("confluenceLocation", "url"),
        ("salesforceLocation", "url"),
        ("sharePointLocation", "url"),
        ("kendraDocumentLocation", "uri"),
        ("customDocumentLocation", "id"),
    ):
        value = location.get(location_key)
        if isinstance(value, dict):
            uri = value.get(value_key)
            if isinstance(uri, str) and uri.strip():
                return uri.strip()

    metadata = reference.get("metadata")
    if isinstance(metadata, dict):
        for key in ("x-amz-bedrock-kb-source-uri", "source_uri", "uri"):
            uri = metadata.get(key)
            if isinstance(uri, str) and uri.strip():
                return uri.strip()

    return None


def _extract_sources(response: dict[str, Any]) -> tuple[KnowledgeSource, ...]:
    sources: list[KnowledgeSource] = []
    seen: set[tuple[str, str | None]] = set()

    for citation in response.get("citations", []):
        if not isinstance(citation, dict):
            continue
        for reference in citation.get("retrievedReferences", []):
            if not isinstance(reference, dict):
                continue

            metadata = reference.get("metadata")
            if not isinstance(metadata, dict):
                metadata = {}
            uri = _reference_uri(reference)
            name = _source_name(uri, metadata)
            if not name:
                continue

            identity = (name, uri)
            if identity in seen:
                continue
            seen.add(identity)
            sources.append(KnowledgeSource(name=name, uri=uri))

    return tuple(sources)


class KnowledgeBaseService:
    """Query an Amazon Bedrock Knowledge Base and generate grounded answers."""

    def __init__(
        self,
        *,
        client: Any | None = None,
        knowledge_base_id: str | None = None,
        model_arn: str | None = None,
        aws_region: str | None = None,
    ) -> None:
        self.knowledge_base_id = knowledge_base_id or os.getenv("KNOWLEDGE_BASE_ID")
        self.model_arn = model_arn or os.getenv("KNOWLEDGE_BASE_MODEL_ARN")
        self.aws_region = aws_region or os.getenv("AWS_REGION")

        missing = [
            name
            for name, value in (
                ("KNOWLEDGE_BASE_ID", self.knowledge_base_id),
                ("KNOWLEDGE_BASE_MODEL_ARN", self.model_arn),
                ("AWS_REGION", self.aws_region),
            )
            if not value
        ]
        if missing:
            raise KnowledgeBaseConfigurationError(
                f"Missing Knowledge Base configuration: {', '.join(missing)}"
            )

        self.client = client or boto3.client(
            service_name="bedrock-agent-runtime",
            region_name=self.aws_region,
        )

    def ask(self, question: str) -> KnowledgeBaseAnswer:
        """Retrieve relevant passages and generate a grounded answer."""
        normalized_question = question.strip()
        if not normalized_question:
            raise ValueError("Question must not be blank")

        try:
            response = self.client.retrieve_and_generate(
                input={"text": normalized_question},
                retrieveAndGenerateConfiguration={
                    "type": "KNOWLEDGE_BASE",
                    "knowledgeBaseConfiguration": {
                        "knowledgeBaseId": self.knowledge_base_id,
                        "modelArn": self.model_arn,
                    },
                },
            )
        except (BotoCoreError, ClientError) as exc:
            raise KnowledgeBaseQueryError(
                "Amazon Bedrock failed to query the Knowledge Base"
            ) from exc

        answer = response.get("output", {}).get("text")
        if not isinstance(answer, str) or not answer.strip():
            raise KnowledgeBaseQueryError(
                "Amazon Bedrock returned an empty Knowledge Base answer"
            )

        return KnowledgeBaseAnswer(
            text=answer.strip(),
            sources=_extract_sources(response),
        )


_knowledge_base_service: KnowledgeBaseService | None = None


def get_knowledge_base_service() -> KnowledgeBaseService:
    """Return the shared Knowledge Base service instance."""
    global _knowledge_base_service
    if _knowledge_base_service is None:
        _knowledge_base_service = KnowledgeBaseService()
    return _knowledge_base_service


def ask_knowledge_base(question: str) -> KnowledgeBaseAnswer:
    """Convenience function used by the FastAPI endpoint."""
    return get_knowledge_base_service().ask(question)
