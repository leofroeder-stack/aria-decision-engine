# aria-decision-engine

Fast **structured decision engine** via Groq (JSON mode, ~85ms latency, ~$0.00004/decision). Use it for binary/categorical/score classifications at high volume — email triage, task urgency, content filtering, DTC severity — instead of a full LLM chat call.

No build step, no npm publish needed.

---

## 📖 Step-by-step setup (first time, ~2 minutes)

### Step 1 — Make sure you have Node.js 18 or newer
```bash
node -v
```
If you don't have Node, install it from [nodejs.org](https://nodejs.org) (download the LTS version) or via a package manager:
```bash
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm
```

### Step 2 — Get a free Groq API key
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up (free, no credit card required)
3. Click "Create API Key" and copy it (starts with `gsk_`)

### Step 3 — Save your key as an environment variable
```bash
export GROQ_API_KEY=gsk_paste_your_key_here
```
> Tip: add that line to your `~/.zshrc` or `~/.bashrc` so you don't have to re-type it every terminal session.

### Step 4 — Run it
```bash
npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git --input "We were billed twice, please refund today or we cancel." --schema "{department: 'billing'|'technical'|'other', urgency: 'low'|'medium'|'high', churn_risk: bool}"
```

Expected output:
```json
{
  "decision": { "department": "billing", "urgency": "high", "churn_risk": true },
  "latency_ms": 92,
  "tokens_used": 187,
  "model": "openai/gpt-oss-20b"
}
```

That's it — nothing to install permanently, no repo to clone by hand.

> **Note on `npx`:** if `npx github:owner/repo` (short form) doesn't produce output on your system, use the longer `npx git+https://github.com/...` form shown above — it's more reliable across npm versions. If you want it always available, install globally once: `npm install -g git+https://github.com/leofroeder-stack/aria-decision-engine.git` then just run `aria-decision-engine --input ... --schema ...` directly.

---

## 🧪 More real-world examples

### Example 1 — Email triage
```bash
npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git \
  --input "From: recruiter@trucking-jobs.com | Subject: CDL Driver Position | We have an opening, competitive pay." \
  --schema "{category: 'billing'|'recruiting'|'marketing'|'support'|'other', needs_action: bool, spam_likelihood: number 0-1}"
```

### Example 2 — Fleet fault / DTC severity
```bash
npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git \
  --input "SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected" \
  --schema "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}"
```

### Example 3 — Support ticket urgency (with few-shot examples for better accuracy)
```bash
npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git \
  --input "The app crashes every time I open settings." \
  --schema "{urgency_score: number 1-10, category: 'bug'|'feature_request'|'question'}" \
  --examples '["App is completely down for all users -> urgency_score: 10, category: bug", "Could you add dark mode? -> urgency_score: 2, category: feature_request"]'
```

### Example 4 — Using it as a JS module (see `examples/` folder for full runnable files)
```js
import { decide } from 'aria-decision-engine';

const result = await decide({
  input: 'SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected',
  schemaDescription: "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}",
  apiKey: process.env.GROQ_API_KEY,
});

console.log(result.decision); // { severity: 'critical', requires_shutdown: true }
```

Runnable versions of all 3 examples above live in [`examples/`](./examples) — clone the repo and run:
```bash
git clone https://github.com/leofroeder-stack/aria-decision-engine.git
cd aria-decision-engine
export GROQ_API_KEY=gsk_your_key
node examples/email-triage.js
node examples/dtc-severity.js
node examples/support-ticket.js
```

---

## CLI reference

| Flag | Required | Description |
|---|---|---|
| `--input` | yes | The text/context to classify |
| `--schema` | yes | Plain-language description of the expected JSON schema |
| `--examples` | no | JSON array of few-shot example strings |
| `--model` | no | Default: `openai/gpt-oss-20b` |
| `--key` | no | Groq API key (or use `GROQ_API_KEY` env var) |

Run `--help` any time for this reference inline.

## Why not just call an LLM directly?

This wraps the Groq call with:
- **Forced JSON mode** (`response_format: json_object`) — no markdown fences, no prose to parse
- **`temperature: 0`** — deterministic, repeatable classifications
- **`reasoning_effort: 'low'`** — keeps latency near ~85ms instead of paying for chain-of-thought
- A **system prompt guardrail** that prevents boolean fields (like `needs_action`) from being marked `true` for passive/FYI content — only for items that genuinely need a response or decision

## Cost

At Groq's pricing for `openai/gpt-oss-20b`, a typical decision (~200–800 tokens) costs roughly **$0.00004**. Even at 2,000 decisions/day that's under **$3/month**.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing Groq API key` | Run `export GROQ_API_KEY=gsk_...` before the command |
| `Groq API error: 401` | Your key is invalid/expired — generate a new one at console.groq.com/keys |
| `npx github:...` produces no output | Use the longer `npx git+https://github.com/...` form, or install globally with `npm install -g` |
| `Failed to parse model output as JSON` | Make your `--schema` description more explicit/simpler |

## License

MIT — do whatever you want with it.

---

## 🤖 Integrating with AI agents (Claude, ChatGPT, Gemini, Hermes, Cursor...)

There are 3 ways to plug this into an AI agent's workflow, depending on the platform.

### Option A — MCP (Claude Desktop, Claude Code, Cursor, Hermes, OpenClaw, any MCP client)

This repo ships a native **MCP server** (`mcp-server.js`) that exposes a `decide` tool. Any agent that speaks the Model Context Protocol can call it directly — no HTTP hosting needed, it runs as a local subprocess.

**Claude Desktop** — add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "aria-decision-engine": {
      "command": "npx",
      "args": ["--yes", "git+https://github.com/leofroeder-stack/aria-decision-engine.git", "aria-decision-engine-mcp"],
      "env": { "GROQ_API_KEY": "gsk_your_key_here" }
    }
  }
}
```
Restart Claude Desktop — it will now see a `decide` tool it can call for any classification task.

**Cursor / Hermes / OpenClaw / any MCP-compatible agent** — same idea, add an MCP server entry pointing to `aria-decision-engine-mcp` with `GROQ_API_KEY` in its env. Check your agent's docs for where its MCP config file lives (Cursor: Settings → MCP; Hermes: its `config.yaml` under `mcpServers`).

### Option B — Agentic coding tools with shell access (Claude Code, Hermes `--yolo`, OpenClaw, any agent that can run terminal commands)

You don't even need MCP for these — just tell the agent (in its system prompt or instructions file) that it has this tool available via shell:
```bash
export GROQ_API_KEY=gsk_your_key
npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git --input "<text>" --schema "<json schema description>"
```
The agent runs it as a normal shell command and reads the JSON from stdout. This works today with zero extra setup.

### Option C — ChatGPT / Gemini API function-calling (when building your own app)

If you're building your own app on the OpenAI or Gemini API (not the chat UIs), define this as a function/tool in your own backend and call `decide()` inside the handler:

```json
{
  "name": "decide",
  "description": "Fast structured decision engine for classification tasks (urgency, category, spam, severity, etc.)",
  "parameters": {
    "type": "object",
    "properties": {
      "input": { "type": "string", "description": "Text/context to classify" },
      "schema_description": { "type": "string", "description": "Plain-language description of expected JSON schema" }
    },
    "required": ["input", "schema_description"]
  }
}
```

```js
import { decide } from 'aria-decision-engine';

// inside your function-calling handler, when the model calls "decide":
const result = await decide({ input: args.input, schemaDescription: args.schema_description, apiKey: process.env.GROQ_API_KEY });
```

ChatGPT.com and the Gemini consumer app don't support arbitrary third-party tools without a custom GPT/Extension — Option C is for developers calling the raw APIs, not the consumer chat apps.

---

## 🏁 Live benchmark: with vs. without decision engine

Want to SEE the difference instead of just reading about it? Run a real side-by-side benchmark against the live Groq API — same 3 real-world inputs, run through both a naive full-LLM call and `decide()`, measuring actual latency, tokens, and estimated cost.

```bash
git clone https://github.com/leofroeder-stack/aria-decision-engine.git
cd aria-decision-engine
export GROQ_API_KEY=gsk_your_key
node examples/benchmark.js
```

Sample output shape:
```
=== aria-decision-engine LIVE BENCHMARK ===

--- Case 1: "From: recruiter@trucking-jobs.com..." ---
  WITHOUT decision engine: 1840ms | 412 tokens | "Based on the content, this appears to be..."
  WITH decision engine:    94ms  | 156 tokens | {"category":"recruiting","needs_action":true,"spam_likelihood":0.1}

=== SUMMARY (3 calls) ===
WITHOUT decision engine:  5210ms total | 1180 tokens | ~$0.000696
WITH decision engine:     280ms total  | 470 tokens  | ~$0.000047

Speedup: 18.6x faster | Cost reduction: 14.8x cheaper
```

Actual numbers vary by run (Groq load, model version), but the pattern is consistent: forcing JSON mode + `temperature:0` + `reasoning_effort:low` on a smaller model beats a naive free-text call to a bigger model on both speed and cost for structured classification tasks — without sacrificing accuracy on the kind of yes/no/category decisions this is built for.
