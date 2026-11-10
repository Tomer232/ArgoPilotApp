# /// script
# requires-python = ">=3.11"
# dependencies = ["ollama"]
# ///
"""Minimal terminal chat agent: qwen3:1.7b on Ollama with one tool."""
from datetime import date

from ollama import chat

MODEL = "qwen3:1.7b"
SYSTEM = "You don't know today's date. Always use the tool, never guess."


def current_date() -> str:
    """Get today's date and weekday, e.g. "2026-11-07 (Saturday)"."""
    today = date.today()
    return f"{today.isoformat()} ({today.strftime('%A')})"


TOOLS = {"current_date": current_date}


def answer(messages: list) -> str:
    """Call the model, run any tool calls, repeat until it replies with text."""
    while True:
        response = chat(model=MODEL, messages=messages, tools=[current_date], think=False)
        messages.append(response.message)
        if not response.message.tool_calls:
            return response.message.content
        for call in response.message.tool_calls:
            try:
                result = TOOLS[call.function.name](**call.function.arguments)
            except Exception as error:  # bad tool name or args: tell the model
                result = f"Error: {error}"
            messages.append({"role": "tool", "tool_name": call.function.name, "content": result})


def main() -> None:
    """Read user lines until 'exit', keeping one shared messages list."""
    messages = [{"role": "system", "content": SYSTEM}]
    while (line := input("you> ").strip()) != "exit":
        messages.append({"role": "user", "content": line})
        print("agent>", answer(messages))


if __name__ == "__main__":
    main()
