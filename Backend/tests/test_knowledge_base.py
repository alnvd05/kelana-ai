import os
import unittest
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError
from fastapi import HTTPException

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
import services.kb_service as kb_service


class KnowledgeBaseServiceTests(unittest.TestCase):
    def setUp(self):
        knowledge_base_id_patch = patch.object(
            kb_service,
            "KNOWLEDGE_BASE_ID",
            "KB12345678",
        )
        knowledge_base_id_patch.start()
        self.addCleanup(knowledge_base_id_patch.stop)

    def test_client_uses_bedrock_agent_runtime_and_configured_region(self):
        with patch.object(kb_service.boto3, "client") as boto3_client:
            kb_service.get_bedrock_agent_runtime_client()

        boto3_client.assert_called_once_with(
            service_name="bedrock-agent-runtime",
            region_name=kb_service.AWS_REGION,
        )

    def test_retrieve_and_generate_uses_managed_search_and_joins_snippets(self):
        client = MagicMock()
        client.retrieve.return_value = {
            "retrievalResults": [
                {"content": {"text": "  Indonesian travelers need a visa.  "}},
                {"content": {"text": " A passport must be valid. "}},
                {"content": {"text": "  "}},
            ]
        }

        with patch.object(
            kb_service,
            "get_bedrock_agent_runtime_client",
            return_value=client,
        ):
            answer = kb_service.retrieve_and_generate("Do I need a visa?")

        self.assertEqual(
            answer,
            "Indonesian travelers need a visa.\n\nA passport must be valid.",
        )
        client.retrieve.assert_called_once_with(
            knowledgeBaseId="KB12345678",
            retrievalQuery={"text": "Do I need a visa?"},
            retrievalConfiguration={
                "managedSearchConfiguration": {
                    "numberOfResults": 5,
                },
            },
        )

    def test_missing_knowledge_base_id_raises_value_error(self):
        with patch.object(kb_service, "KNOWLEDGE_BASE_ID", None):
            with self.assertRaisesRegex(
                ValueError,
                "KNOWLEDGE_BASE_ID is not set",
            ):
                kb_service.retrieve_and_generate("What documents do I need?")

    def test_empty_retrieval_returns_empty_string(self):
        client = MagicMock()
        client.retrieve.return_value = {"retrievalResults": []}

        with patch.object(
            kb_service,
            "get_bedrock_agent_runtime_client",
            return_value=client,
        ):
            answer = kb_service.retrieve_and_generate("Unknown question")

        self.assertEqual(answer, "")

    def test_aws_client_error_is_propagated(self):
        client = MagicMock()
        client.retrieve.side_effect = ClientError(
            {
                "Error": {
                    "Code": "AccessDeniedException",
                    "Message": "denied",
                }
            },
            "Retrieve",
        )

        with patch.object(
            kb_service,
            "get_bedrock_agent_runtime_client",
            return_value=client,
        ):
            with self.assertRaises(ClientError):
                kb_service.retrieve_and_generate("What documents do I need?")


class AskEndpointTests(unittest.TestCase):
    def test_endpoint_returns_question_and_retrieved_answer(self):
        with patch.object(
            main,
            "retrieve_and_generate",
            return_value="A valid passport and visa are required.",
        ) as service:
            response = main.ask(
                main.AskRequest(question="What documents are required?")
            )

        self.assertEqual(
            response,
            {
                "question": "What documents are required?",
                "answer": "A valid passport and visa are required.",
            },
        )
        service.assert_called_once_with("What documents are required?")

    def test_endpoint_maps_value_error_to_bad_request(self):
        with patch.object(
            main,
            "retrieve_and_generate",
            side_effect=ValueError("KNOWLEDGE_BASE_ID is not set"),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.ask(main.AskRequest(question="Visa requirements?"))

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(
            raised.exception.detail,
            "KNOWLEDGE_BASE_ID is not set",
        )

    def test_ask_route_matches_instructor_contract(self):
        operation = main.app.openapi()["paths"]["/api/v1/ask"]["post"]

        self.assertFalse(operation.get("security"))
        request_schema = operation["requestBody"]["content"][
            "application/json"
        ]["schema"]
        self.assertEqual(request_schema["$ref"], "#/components/schemas/AskRequest")


if __name__ == "__main__":
    unittest.main()
