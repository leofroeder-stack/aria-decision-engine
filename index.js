#!/usr/bin/env node
/**
 * aria-decision-engine
 * Fast structured decision engine via Groq (JSON mode, ~85ms, ~$0.00004/decision).
 * Standalone, dependency-free. Use as a CLI or import as a module.
 *
 * CLI:
 *   export GROQ_API_KEY=gsk_your_key
 *   npx github:leofroeder-stack/aria-decision-engine --input "text" --schema "{is_spam: bool}"
 *
 * Module:
 *   import { decide } from 'aria-decision-engine';
 *   const result = await decide({ input, schemaDescription, apiKey });
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function decide({
  input,
  schemaDescription,
  examples = [],
  model = 'openai/gpt-oss-20b',
  apiKey = process.env.GROQ_API_KEY,
  reasoningEffort = 'low',
}) {
  if (!apiKey) throw new Error('Missing Groq API key. Set GROQ_API_KEY env var or pass apiKey.');
  if (!input || !schemaDescription) throw new Error('input and schemaDescription are required.');

  const t0 = Date.now();

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a structured decision engine, not a chatbot. Respond ONLY with valid JSON matching this exact schema: ${schemaDescription}. Rules: (1) boolean fields like "needs_action" must be true ONLY if the item requires a direct response, decision, or deadline from the user — NOT for passive recommendations, suggestions, or FYI content. (2) No prose, no explanation, no markdown fences — raw JSON only.`,
        },
        ...examples.map((e) => ({ role: 'user', content: e })),
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      reasoning_effort: reasoningEffort,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${res.status} — ${errText}`);
  }

  const data = await res.json();
  const latency_ms = Date.now() - t0;

  let decision;
  try {
    decision = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error(`Failed to parse model output as JSON: ${data.choices?.[0]?.message?.content}`);
  }

  return {
    decision,
    latency_ms,
    tokens_used: data.usage?.total_tokens || 0,
    reasoning_tokens: data.usage?.completion_tokens_details?.reasoning_tokens || 0,
    model,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    console.log(`
aria-decision-engine — fast structured decisions via Groq (JSON mode)

USAGE:
  export GROQ_API_KEY=gsk_your_key_here
  npx github:leofroeder-stack/aria-decision-engine --input "text to classify" --schema "{is_spam: bool, urgency: 'low'|'high'}"

OPTIONS:
  --input      <string>   Required. The text/context to classify.
  --schema     <string>   Required. Description of the expected JSON schema.
  --examples   <json arr> Optional. Few-shot examples as a JSON array of strings.
  --model      <string>   Optional. Default: openai/gpt-oss-20b
  --key        <string>   Optional. Groq API key (else uses GROQ_API_KEY env var).

Get a free Groq API key: https://console.groq.com/keys
`);
    process.exit(0);
  }

  const args = parseArgs(argv);
  try {
    const examples = args.examples ? JSON.parse(args.examples) : [];
    const result = await decide({
      input: args.input,
      schemaDescription: args.schema,
      examples,
      model: args.model || undefined,
      apiKey: args.key || process.env.GROQ_API_KEY,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
