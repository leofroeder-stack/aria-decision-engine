# aria-decision-engine

Fast **structured decision engine** via Groq (JSON mode, ~85ms latency, ~$0.00004/decision). Use it for binary/categorical/score classifications at high volume — email triage, task urgency, content filtering, DTC severity — instead of a full LLM chat call.

No build step, no dependencies, no npm publish needed. Runs straight from GitHub.

## Quickstart (1 line, no install)

```bash
export GROQ_API_KEY=gsk_your_key_here   # free key: https://console.groq.com/keys
npx github:leofroeder-stack/aria-decision-engine --input "We were billed twice, please refund today or we cancel." --schema "{department: 'billing'|'technical'|'other', urgency: 'low'|'medium'|'high', churn_risk: bool}"
```

Output:
```json
{
  "decision": { "department": "billing", "urgency": "high", "churn_risk": true },
  "latency_ms": 92,
  "tokens_used": 187,
  "model": "openai/gpt-oss-20b"
}
```

## CLI options

| Flag | Required | Description |
|---|---|---|
| `--input` | yes | The text/context to classify |
| `--schema` | yes | Plain-language description of the expected JSON schema |
| `--examples` | no | JSON array of few-shot example strings |
| `--model` | no | Default: `openai/gpt-oss-20b` |
| `--key` | no | Groq API key (or use `GROQ_API_KEY` env var) |

## As a module

```bash
npm install github:leofroeder-stack/aria-decision-engine
```

```js
import { decide } from 'aria-decision-engine';

const result = await decide({
  input: 'SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected',
  schemaDescription: "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}",
  apiKey: process.env.GROQ_API_KEY,
});

console.log(result.decision); // { severity: 'critical', requires_shutdown: true }
```

## Why not just call an LLM directly?

This wraps the Groq call with:
- **Forced JSON mode** (`response_format: json_object`) — no markdown fences, no prose to parse
- **`temperature: 0`** — deterministic, repeatable classifications
- **`reasoning_effort: 'low'`** — keeps latency near ~85ms instead of paying for chain-of-thought
- A **system prompt guardrail** that prevents boolean fields (like `needs_action`) from being marked `true` for passive/FYI content — only for items that genuinely need a response or decision

## Cost

At Groq's pricing for `openai/gpt-oss-20b`, a typical decision (~200–800 tokens) costs roughly **$0.00004**. Even at 2,000 decisions/day that's under **$3/month**.

## License

MIT — do whatever you want with it.
