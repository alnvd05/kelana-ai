import os
from typing import Any, Dict, Sequence

import boto3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class BedrockService:
    """Service to interact with AWS Bedrock API"""

    def __init__(self):
        """Initialize Bedrock client with credentials from environment"""
        self.aws_bearer_token = os.getenv("AWS_BEARER_TOKEN_BEDROCK")
        self.aws_region = os.getenv("AWS_REGION")
        self.model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")

        if not self.aws_bearer_token:
            raise ValueError("AWS_BEARER_TOKEN_BEDROCK not found in environment variables")

        if not self.aws_region:
            raise ValueError("AWS_REGION not found in environment variables")

        # Initialize Bedrock Runtime client
        self.bedrock_runtime = self._configure_bedrock_client()

    def _configure_bedrock_client(self) -> boto3.client:
        """
        Configure and return AWS Bedrock Runtime client.

        Note: Bedrock API Keys use bearer-token auth, not access/secret key
        pairs. boto3 reads AWS_BEARER_TOKEN_BEDROCK from the environment
        automatically — it must NOT be passed as aws_access_key_id /
        aws_secret_access_key.

        Returns:
            boto3.client: Configured Bedrock Runtime client
        """
        try:
            client = boto3.client(
                service_name="bedrock-runtime",
                region_name=self.aws_region,
            )
            return client
        except Exception as e:
            raise Exception(f"Failed to configure Bedrock client: {str(e)}")

    def get_ai_recommendation(
        self,
        destination: str,
        days: int,
        budget: float,
        travel_style: str,
    ) -> Dict[str, Any]:
        """
        Get AI travel itinerary recommendation from AWS Bedrock

        Args:
            destination: Travel destination
            days: Number of days for the trip
            budget: Budget in USD
            travel_style: Type of travel (e.g., luxury, budget, adventure, cultural)

        Returns:
            Dict containing the AI recommendation and metadata
        """
        # Construct the prompt
        prompt = f"""You are an experienced travel planner.
Plan a {days}-day itinerary for {destination}.
Budget: USD {budget}
Travel Style: {travel_style}

Respond with ONLY a single valid JSON object. No markdown, no code fences, no text before or after the JSON. Match this exact structure:

{{
  "itinerary": [
    {{
      "day": 1,
      "location": "city or area for this day",
      "morning": "2-3 specific morning activities",
      "afternoon": "cultural sites and experiences",
      "evening": "dinner spots and nightlife suggestions",
      "daily_budget_usd": "e.g. $60"
    }}
  ],
  "travel_tips": ["short practical tip", "..."],
  "local_food_recommendations": ["dish or restaurant name", "..."],
  "budget_breakdown": {{
    "accommodation": "USD amount",
    "transportation": "USD amount",
    "food": "USD amount",
    "activities": "USD amount",
    "total_estimated": "USD amount"
  }}
}}

Rules:
- "itinerary" must contain exactly {days} objects, one per day, numbered sequentially starting at 1.
- Use USD ($) for every monetary figure. Do not use any other currency.
- "total_estimated" must equal the actual sum of accommodation + transportation + food + activities. Check your arithmetic before answering.
- "travel_tips" should have 3-5 items.
- "local_food_recommendations" should have 3-6 items.
- Output must be valid, parseable JSON. No trailing commas, no comments, no markdown formatting inside the values."""

        try:
            response = self.bedrock_runtime.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"text": prompt}
                        ],
                    }
                ],
                inferenceConfig={
                    "maxTokens": 2048,
                    "temperature": 0.7,
                    "topP": 0.9,
                },
            )

            recommendation_text = response["output"]["message"]["content"][0]["text"]

            cleaned_text = recommendation_text.strip()
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text.strip("`")
                if cleaned_text.lower().startswith("json"):
                    cleaned_text = cleaned_text[4:]
                cleaned_text = cleaned_text.strip()
                
            return {
                "success": True,
                "recommendation": cleaned_text,
                "model_id": self.model_id,
                "metadata": {
                    "destination": destination,
                    "days": days,
                    "budget": budget,
                    "travel_style": travel_style,
                    "stop_reason": response.get("stopReason"),
                    "usage": response.get("usage", {}),
                },
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "recommendation": None,
                "metadata": {
                    "destination": destination,
                    "days": days,
                    "budget": budget,
                    "travel_style": travel_style,
                },
            }

    def get_conversation_response(
        self,
        messages: Sequence[dict[str, str]],
    ) -> Dict[str, Any]:
        """Generate a response using the complete persisted chat history."""
        if not messages:
            return {
                "success": False,
                "error": "Conversation history is empty",
                "response": None,
            }

        bedrock_messages = [
            {
                "role": message["role"],
                "content": [{"text": message["content"]}],
            }
            for message in messages
        ]

        try:
            response = self.bedrock_runtime.converse(
                modelId=self.model_id,
                system=[
                    {
                        "text": (
                            "You are KelanaAI, a practical and friendly travel assistant. "
                            "Use the conversation history to understand follow-up questions. "
                            "Be specific, concise, and transparent when information is uncertain."
                        )
                    }
                ],
                messages=bedrock_messages,
                inferenceConfig={
                    "maxTokens": 2048,
                    "temperature": 0.6,
                    "topP": 0.9,
                },
            )
            content_blocks = response["output"]["message"].get("content", [])
            response_text = "\n".join(
                block["text"].strip()
                for block in content_blocks
                if block.get("text", "").strip()
            )
            if not response_text:
                raise ValueError("Amazon Bedrock returned an empty response")

            return {
                "success": True,
                "response": response_text,
                "model_id": self.model_id,
                "usage": response.get("usage", {}),
                "stop_reason": response.get("stopReason"),
            }
        except Exception as exc:
            return {
                "success": False,
                "error": str(exc),
                "response": None,
            }


# Singleton instance
_bedrock_service = None


def get_bedrock_service() -> BedrockService:
    """
    Get or create singleton instance of BedrockService

    Returns:
        BedrockService: Configured Bedrock service instance
    """
    global _bedrock_service
    if _bedrock_service is None:
        _bedrock_service = BedrockService()
    return _bedrock_service
