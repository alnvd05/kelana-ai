import os
from typing import Any, Dict

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

For each day, please include:
- Morning: 2-3 specific morning activities
- Afternoon: cultural sites and experiences
- Evening: dinner spots and nightlife suggestions
- Estimated daily budget (broken down by category if possible)
- Local food recommendations
- Transportation suggestions

Format your response as Markdown with headers (##) and bullet lists (-)."""

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

            return {
                "success": True,
                "recommendation": recommendation_text,
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