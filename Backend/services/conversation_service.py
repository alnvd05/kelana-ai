DEFAULT_CONVERSATION_TITLE = "New conversation"
MAX_AUTOMATIC_TITLE_LENGTH = 56


def derive_conversation_title(message: str) -> str:
    """Create a compact title from the first user message."""
    compact = " ".join(message.split())
    if len(compact) <= MAX_AUTOMATIC_TITLE_LENGTH:
        return compact
    return compact[: MAX_AUTOMATIC_TITLE_LENGTH - 1].rstrip() + "…"


def build_bedrock_messages(messages) -> list[dict[str, str]]:
    """Convert persisted messages into the ordered Bedrock chat history."""
    history: list[dict[str, str]] = []
    for message in messages:
        if history and history[-1]["role"] == message.role:
            history[-1]["content"] += f"\n\n{message.content}"
        else:
            history.append({"role": message.role, "content": message.content})
    return history
