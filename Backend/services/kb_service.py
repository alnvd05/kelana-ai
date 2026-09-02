import os

import boto3
from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID")


def get_bedrock_agent_runtime_client():
    """Build and return a boto3 Bedrock Agent Runtime client."""
    return boto3.client(
        service_name="bedrock-agent-runtime",
        region_name=AWS_REGION,
    )


def retrieve_and_generate(query: str) -> str:
    """Retrieve relevant text snippets from the Bedrock Knowledge Base."""
    missing_vars = [
        name
        for name, value in {
            "KNOWLEDGE_BASE_ID": KNOWLEDGE_BASE_ID,
        }.items()
        if not value
    ]
    if missing_vars:
        raise ValueError(
            f"{', '.join(missing_vars)} is not set. "
            "Check your .env file."
        )

    client = get_bedrock_agent_runtime_client()

    response = client.retrieve(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
        retrievalQuery={"text": query},
        retrievalConfiguration={
            "managedSearchConfiguration": {
                "numberOfResults": 5,
            },
        },
    )

    snippets = [
        result.get("content", {}).get("text", "").strip()
        for result in response.get("retrievalResults", [])
        if result.get("content", {}).get("text", "").strip()
    ]
    return "\n\n".join(snippets)
