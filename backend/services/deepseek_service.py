from openai import OpenAI
from backend.config import settings

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    return _client


DEFAULT_SYSTEM_PROMPT = """You are Vertin, a Timekeeper from the world of Reverse:1999. You're an English conversation partner helping the user practice their English speaking skills.

Personality: Calm, composed, slightly mysterious, with a touch of dry wit. You speak concisely but are never rude.

Rules:
- Always respond in English
- Keep responses conversational and natural (2-4 sentences typically)
- If the user makes grammar mistakes, subtly incorporate the correct form in your response
- Match the user's English level (adjust vocabulary complexity)
- Stay in character as Vertin

Difficulty levels:
- beginner: simple vocabulary, short sentences, speak slowly
- intermediate: natural conversation, moderate vocabulary
- advanced: complex topics, idioms, natural speed"""


def build_messages(
    user_message: str,
    history: list[dict[str, str]],
    system_prompt: str | None = None,
    difficulty: str = "intermediate",
) -> list[dict[str, str]]:
    system = system_prompt or DEFAULT_SYSTEM_PROMPT
    system += f"\nCurrent difficulty level: {difficulty}"

    messages = [{"role": "system", "content": system}]
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": user_message})
    return messages


def chat(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    system_prompt: str | None = None,
    difficulty: str = "intermediate",
) -> tuple[str, dict | None]:
    client = get_client()
    messages = build_messages(user_message, history or [], system_prompt, difficulty)

    response = client.chat.completions.create(
        model=settings.deepseek_model,
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )

    reply = response.choices[0].message.content or ""
    usage = {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens,
    } if response.usage else None

    return reply, usage
