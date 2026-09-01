import os
import unittest
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError
from fastapi import HTTPException
from pydantic import ValidationError

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
from services.kb_services import (
    KnowledgeBaseAnswer,
    KnowledgeBaseConfigurationError,
    KnowledgeBaseQueryError,
    KnowledgeBaseService,
    KnowledgeSource,
)


class KnowledgeBaseServiceTests(unittest.TestCase):
    def test_ask_uses_retrieve_and_generate_and_returns_grounded_answer(self):
        client = MagicMock()
        client.retrieve_and_generate.return_value = {
            "output": {"text": "  Indonesian travelers need a visa.  "},
            "citations": [
                {
                    "retrievedReferences": [
                        {
                            "location": {
                                "s3Location": {
                                    "uri": "s3://kelana-travel-docs/visa-japan.pdf"
                                }
                            },
                            "metadata": {},
                        }
                    ]
                }
            ],
        }
        service = KnowledgeBaseService(
            client=client,
            knowledge_base_id="KB12345678",
            model_arn="arn:aws:bedrock:ap-southeast-1::foundation-model/test-model",
            aws_region="ap-southeast-1",
        )

        answer = service.ask("  Do I need a visa?  ")

        self.assertEqual(answer.text, "Indonesian travelers need a visa.")
        self.assertEqual(
            answer.sources,
            (
                KnowledgeSource(
                    name="visa-japan.pdf",
                    uri="s3://kelana-travel-docs/visa-japan.pdf",
                ),
            ),
        )
        client.retrieve_and_generate.assert_called_once_with(
            input={"text": "Do I need a visa?"},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": "KB12345678",
                    "modelArn": (
                        "arn:aws:bedrock:ap-southeast-1::foundation-model/test-model"
                    ),
                },
            },
        )

    def test_missing_configuration_is_reported_before_client_creation(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(
                KnowledgeBaseConfigurationError,
                "KNOWLEDGE_BASE_ID.*KNOWLEDGE_BASE_MODEL_ARN.*AWS_REGION",
            ):
                KnowledgeBaseService()

    def test_aws_client_error_is_translated_to_query_error(self):
        client = MagicMock()
        client.retrieve_and_generate.side_effect = ClientError(
            {
                "Error": {
                    "Code": "AccessDeniedException",
                    "Message": "denied",
                }
            },
            "RetrieveAndGenerate",
        )
        service = KnowledgeBaseService(
            client=client,
            knowledge_base_id="KB12345678",
            model_arn="arn:aws:bedrock:ap-southeast-1::foundation-model/test-model",
            aws_region="ap-southeast-1",
        )

        with self.assertRaises(KnowledgeBaseQueryError):
            service.ask("What documents do I need?")

    def test_empty_answer_is_rejected(self):
        client = MagicMock()
        client.retrieve_and_generate.return_value = {"output": {"text": "  "}}
        service = KnowledgeBaseService(
            client=client,
            knowledge_base_id="KB12345678",
            model_arn="arn:aws:bedrock:ap-southeast-1::foundation-model/test-model",
            aws_region="ap-southeast-1",
        )

        with self.assertRaises(KnowledgeBaseQueryError):
            service.ask("What documents do I need?")

    def test_duplicate_references_are_returned_once(self):
        reference = {
            "location": {
                "s3Location": {"uri": "s3://kelana-travel-docs/visa-japan.pdf"}
            },
            "metadata": {},
        }
        client = MagicMock()
        client.retrieve_and_generate.return_value = {
            "output": {"text": "A grounded answer."},
            "citations": [
                {"retrievedReferences": [reference]},
                {"retrievedReferences": [reference]},
            ],
        }
        service = KnowledgeBaseService(
            client=client,
            knowledge_base_id="KB12345678",
            model_arn="arn:aws:bedrock:ap-southeast-1::foundation-model/test-model",
            aws_region="ap-southeast-1",
        )

        result = service.ask("Do I need a visa?")

        self.assertEqual(len(result.sources), 1)


class AskEndpointTests(unittest.TestCase):
    def test_question_request_rejects_blank_question(self):
        with self.assertRaises(ValidationError):
            main.QuestionRequest(question="   ")

    def test_endpoint_returns_question_and_grounded_answer(self):
        with patch.object(
            main,
            "ask_knowledge_base",
            return_value=KnowledgeBaseAnswer(
                text="A valid passport and visa are required.",
                sources=(
                    KnowledgeSource(
                        name="visa-japan.pdf",
                        uri="s3://kelana-travel-docs/visa-japan.pdf",
                    ),
                ),
            ),
        ) as service:
            response = main.ask_endpoint(
                main.QuestionRequest(question="  What documents are required?  ")
            )

        self.assertEqual(response.question, "What documents are required?")
        self.assertEqual(response.answer, "A valid passport and visa are required.")
        self.assertEqual(response.sources[0].name, "visa-japan.pdf")
        service.assert_called_once_with("What documents are required?")

    def test_ask_route_is_documented_as_bearer_protected(self):
        operation = main.app.openapi()["paths"]["/api/v1/ask"]["post"]

        self.assertTrue(operation.get("security"))

    def test_endpoint_maps_query_failure_to_bad_gateway(self):
        with patch.object(
            main,
            "ask_knowledge_base",
            side_effect=KnowledgeBaseQueryError("failed"),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.ask_endpoint(main.QuestionRequest(question="Visa requirements?"))

        self.assertEqual(raised.exception.status_code, 502)
        self.assertEqual(raised.exception.detail, "Knowledge Base request failed")

    def test_endpoint_maps_missing_configuration_to_service_unavailable(self):
        with patch.object(
            main,
            "ask_knowledge_base",
            side_effect=KnowledgeBaseConfigurationError("missing"),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.ask_endpoint(main.QuestionRequest(question="Visa requirements?"))

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail, "Knowledge Base is not configured")


if __name__ == "__main__":
    unittest.main()
