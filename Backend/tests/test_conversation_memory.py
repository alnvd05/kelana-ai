import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import main
from database import Base
from models.conversation import Conversation, Message
from models.user import User
from services.bedrock_service import BedrockService
from services.conversation_service import (
    build_bedrock_messages,
    derive_conversation_title,
)


class ConversationEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        with self.session_factory() as db:
            db.add_all(
                [
                    User(
                        id=1,
                        name="Alice",
                        email="alice@example.com",
                        password_hash="hash",
                        created_by=1,
                        updated_by=1,
                    ),
                    User(
                        id=2,
                        name="Bob",
                        email="bob@example.com",
                        password_hash="hash",
                        created_by=2,
                        updated_by=2,
                    ),
                ]
            )
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_multi_turn_chat_persists_and_rebuilds_context(self):
        current_user = SimpleNamespace(id=1)
        bedrock = MagicMock()
        bedrock.get_conversation_response.side_effect = [
            {"success": True, "response": "Here is a five-day Japan itinerary."},
            {"success": True, "response": "Day 2: explore Asakusa."},
        ]

        with (
            patch.object(main, "SessionLocal", self.session_factory),
            patch.object(main, "get_bedrock_service", return_value=bedrock),
        ):
            created = main.create_conversation(current_user=current_user)
            first = main.send_conversation_message(
                conversation_id=created.conversation_id,
                request=main.SendMessageRequest(
                    content="Plan a family trip to Japan."
                ),
                current_user=current_user,
            )
            second = main.send_conversation_message(
                conversation_id=created.conversation_id,
                request=main.SendMessageRequest(content="What about Day 2?"),
                current_user=current_user,
            )
            messages = main.list_conversation_messages(
                conversation_id=created.conversation_id,
                current_user=current_user,
            )

        self.assertEqual(first.conversation_title, "Plan a family trip to Japan.")
        self.assertEqual(second.assistant_message.content, "Day 2: explore Asakusa.")
        self.assertEqual([message.role for message in messages], [
            "user",
            "assistant",
            "user",
            "assistant",
        ])
        self.assertEqual(
            bedrock.get_conversation_response.call_args_list[1].args[0],
            [
                {"role": "user", "content": "Plan a family trip to Japan."},
                {
                    "role": "assistant",
                    "content": "Here is a five-day Japan itinerary.",
                },
                {"role": "user", "content": "What about Day 2?"},
            ],
        )

    def test_list_and_load_are_scoped_to_current_user(self):
        with self.session_factory() as db:
            db.add_all(
                [
                    Conversation(
                        id=10,
                        user_id=1,
                        title="Alice trip",
                        created_by=1,
                        updated_by=1,
                    ),
                    Conversation(
                        id=20,
                        user_id=2,
                        title="Bob trip",
                        created_by=2,
                        updated_by=2,
                    ),
                ]
            )
            db.commit()

        with patch.object(main, "SessionLocal", self.session_factory):
            conversations = main.list_conversations(
                current_user=SimpleNamespace(id=1)
            )
            with self.assertRaises(HTTPException) as raised:
                main.list_conversation_messages(
                    conversation_id=20,
                    current_user=SimpleNamespace(id=1),
                )

        self.assertEqual([conversation.id for conversation in conversations], [10])
        self.assertEqual(raised.exception.status_code, 404)

    def test_rename_updates_only_owned_conversation(self):
        with self.session_factory() as db:
            db.add(
                Conversation(
                    id=10,
                    user_id=1,
                    title="New conversation",
                    created_by=1,
                    updated_by=1,
                )
            )
            db.commit()

        with patch.object(main, "SessionLocal", self.session_factory):
            renamed = main.rename_conversation(
                conversation_id=10,
                request=main.ConversationRenameRequest(title=" Japan Family Trip "),
                current_user=SimpleNamespace(id=1),
            )

        self.assertEqual(renamed.title, "Japan Family Trip")
        self.assertEqual(renamed.updated_by, 1)

    def test_failed_ai_call_keeps_the_user_message(self):
        bedrock = MagicMock()
        bedrock.get_conversation_response.return_value = {
            "success": False,
            "error": "service unavailable",
            "response": None,
        }

        with (
            patch.object(main, "SessionLocal", self.session_factory),
            patch.object(main, "get_bedrock_service", return_value=bedrock),
        ):
            created = main.create_conversation(
                current_user=SimpleNamespace(id=1)
            )
            with self.assertRaises(HTTPException) as raised:
                main.send_conversation_message(
                    conversation_id=created.conversation_id,
                    request=main.SendMessageRequest(content="Plan Japan"),
                    current_user=SimpleNamespace(id=1),
                )

        self.assertEqual(raised.exception.status_code, 502)
        with self.session_factory() as db:
            stored = db.query(Message).all()
            self.assertEqual(len(stored), 1)
            self.assertEqual(stored[0].content, "Plan Japan")

    def test_conversation_routes_are_bearer_protected(self):
        paths = main.app.openapi()["paths"]
        operations = [
            paths["/api/v1/conversations"]["post"],
            paths["/api/v1/conversations"]["get"],
            paths["/api/v1/conversations/{conversation_id}"]["patch"],
            paths["/api/v1/conversations/{conversation_id}/messages"]["get"],
            paths["/api/v1/conversations/{conversation_id}/messages"]["post"],
        ]
        for operation in operations:
            self.assertTrue(operation.get("security"))


class ConversationServiceTests(unittest.TestCase):
    def test_title_is_compact_and_bounded(self):
        title = derive_conversation_title("  Plan   a very long family trip " * 5)
        self.assertLessEqual(len(title), 56)
        self.assertTrue(title.endswith("…"))
        self.assertNotIn("  ", title)

    def test_adjacent_roles_are_merged_for_bedrock(self):
        messages = [
            SimpleNamespace(role="user", content="First attempt"),
            SimpleNamespace(role="user", content="Please try again"),
            SimpleNamespace(role="assistant", content="Done"),
        ]
        self.assertEqual(
            build_bedrock_messages(messages),
            [
                {"role": "user", "content": "First attempt\n\nPlease try again"},
                {"role": "assistant", "content": "Done"},
            ],
        )

    def test_bedrock_chat_uses_converse_message_history(self):
        service = BedrockService.__new__(BedrockService)
        service.model_id = "amazon.nova-lite-v1:0"
        service.bedrock_runtime = MagicMock()
        service.bedrock_runtime.converse.return_value = {
            "output": {
                "message": {
                    "content": [{"text": "Day 2: visit Asakusa."}]
                }
            },
            "usage": {"inputTokens": 12, "outputTokens": 6},
            "stopReason": "end_turn",
        }
        history = [
            {"role": "user", "content": "Plan Japan"},
            {"role": "assistant", "content": "Five days"},
            {"role": "user", "content": "What about Day 2?"},
        ]

        result = service.get_conversation_response(history)

        self.assertTrue(result["success"])
        self.assertEqual(result["response"], "Day 2: visit Asakusa.")
        call = service.bedrock_runtime.converse.call_args.kwargs
        self.assertEqual(
            [message["role"] for message in call["messages"]],
            ["user", "assistant", "user"],
        )


if __name__ == "__main__":
    unittest.main()
