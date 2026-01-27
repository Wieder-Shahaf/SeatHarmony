import os
import backoff
import requests

# Groq API for Llama models (fast inference)
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile"

completion_tokens = prompt_tokens = 0

# Check for Groq API key
groq_api_key = os.getenv("GROQ_API_KEY", "")

if groq_api_key:
    print(f"Using Groq API with {GROQ_DEFAULT_MODEL}")
else:
    print("Warning: GROQ_API_KEY not found. Set GROQ_API_KEY environment variable.")


def _call_groq_api(messages, model=GROQ_DEFAULT_MODEL, temperature=0.7, max_tokens=1000, stop=None):
    """Call Groq API with the given messages."""
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found in environment")

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if stop:
        payload["stop"] = stop

    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()


def gpt(prompt, model="gpt-4", temperature=0.7, max_tokens=1000, n=1, stop=None) -> list:
    messages = [{"role": "user", "content": prompt}]
    return chatgpt(messages, model=model, temperature=temperature, max_tokens=max_tokens, n=n, stop=stop)


@backoff.on_exception(backoff.expo, Exception, max_tries=3)
def chatgpt(messages, model="gpt-4", temperature=0.7, max_tokens=1000, n=1, stop=None) -> list:
    """
    Chat completion using Groq API with Llama 3.3 70B.

    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Model name (mapped to Groq model)
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        n: Number of completions to generate
        stop: Stop sequences

    Returns:
        List of response strings
    """
    global completion_tokens, prompt_tokens
    outputs = []

    # Map model names to Groq model
    if "gpt-4" in model.lower() or "gpt-3.5" in model.lower():
        groq_model = GROQ_DEFAULT_MODEL
    elif "llama" in model.lower():
        groq_model = model  # Use as-is if already a Llama model
    else:
        groq_model = GROQ_DEFAULT_MODEL

    while n > 0:
        cnt = min(n, 10)  # Groq has rate limits, be conservative
        n -= cnt
        for _ in range(cnt):
            try:
                response = _call_groq_api(
                    messages=messages,
                    model=groq_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stop=stop
                )

                # Extract text from response
                text = response["choices"][0]["message"]["content"]
                outputs.append(text)

                # Track token usage
                usage = response.get("usage", {})
                prompt_tokens += usage.get("prompt_tokens", 0)
                completion_tokens += usage.get("completion_tokens", 0)

            except Exception as e:
                print(f"Groq API error: {e}")
                outputs.append(f"Error: {e}")

    return outputs


def gpt_usage(backend="gpt-4"):
    """Return token usage and estimated cost."""
    global completion_tokens, prompt_tokens
    # Groq pricing for Llama 3.3 70B (very affordable)
    # $0.59 per million input tokens, $0.79 per million output tokens
    cost = completion_tokens / 1_000_000 * 0.79 + prompt_tokens / 1_000_000 * 0.59
    return {"completion_tokens": completion_tokens, "prompt_tokens": prompt_tokens, "cost": cost}
