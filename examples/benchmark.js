// Live benchmark: decisionEngine vs. a naive full-LLM call, on the SAME Groq API + SAME model family.
// Shows the real difference in latency, tokens, and cost side by side.
//
// Run: GROQ_API_KEY=gsk_... node examples/benchmark.js
import { decide } from '../index.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error('Set GROQ_API_KEY first: export GROQ_API_KEY=gsk_...');
  process.exit(1);
}

// Same test cases run through BOTH approaches
const cases = [
  {
    input: 'From: recruiter@trucking-jobs.com | Subject: CDL Driver Position | We have an opening, competitive pay and benefits.',
    schema: "{category: 'billing'|'recruiting'|'marketing'|'support'|'other', needs_action: bool, spam_likelihood: number 0-1}",
  },
  {
    input: 'SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected',
    schema: "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}",
  },
  {
    input: 'We were billed twice, please refund today or we cancel our contract.',
    schema: "{department: 'billing'|'technical'|'other', urgency: 'low'|'medium'|'high', churn_risk: bool}",
  },
];

// "WITHOUT decision engine" = the way most people naively call an LLM for classification:
// full conversational model, no forced JSON mode, default reasoning effort, then they'd
// have to parse free-form text themselves (we just measure the raw call cost here).
async function callWithoutDecisionEngine(input, schemaHint) {
  const t0 = Date.now();
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // bigger, general-purpose chat model — typical "just ask the LLM" choice
      messages: [
        {
          role: 'user',
          content: `Please classify the following and explain your reasoning, then give me the answer in this shape: ${schemaHint}\n\nText: ${input}`,
        },
      ],
    }),
  });
  const data = await res.json();
  return {
    latency_ms: Date.now() - t0,
    tokens_used: data.usage?.total_tokens || 0,
    raw_text: data.choices?.[0]?.message?.content?.slice(0, 120) + '...',
  };
}

// Groq pricing used for the cost estimate (approximate, check console.groq.com/pricing for current rates)
const COST_PER_M_TOKENS_BIG_MODEL = 0.59; // llama-3.3-70b-versatile, blended estimate
const COST_PER_M_TOKENS_DECISION_ENGINE = 0.10; // openai/gpt-oss-20b, blended estimate

async function run() {
  console.log('\n=== aria-decision-engine LIVE BENCHMARK ===');
  console.log('Same 3 real-world inputs, run through BOTH approaches on the same Groq API.\n');

  let totalWithoutMs = 0, totalWithoutTokens = 0;
  let totalWithMs = 0, totalWithTokens = 0;

  for (const [i, c] of cases.entries()) {
    console.log(`\n--- Case ${i + 1}: "${c.input.slice(0, 60)}..." ---`);

    const without = await callWithoutDecisionEngine(c.input, c.schema);
    console.log(`  WITHOUT decision engine: ${without.latency_ms}ms | ${without.tokens_used} tokens | "${without.raw_text}"`);
    totalWithoutMs += without.latency_ms;
    totalWithoutTokens += without.tokens_used;

    const withDE = await decide({ input: c.input, schemaDescription: c.schema, apiKey });
    console.log(`  WITH decision engine:    ${withDE.latency_ms}ms | ${withDE.tokens_used} tokens | ${JSON.stringify(withDE.decision)}`);
    totalWithMs += withDE.latency_ms;
    totalWithTokens += withDE.tokens_used;
  }

  const costWithout = (totalWithoutTokens / 1_000_000) * COST_PER_M_TOKENS_BIG_MODEL;
  const costWith = (totalWithTokens / 1_000_000) * COST_PER_M_TOKENS_DECISION_ENGINE;

  console.log('\n=== SUMMARY (3 calls) ===');
  console.log(`WITHOUT decision engine:  ${totalWithoutMs}ms total | ${totalWithoutTokens} tokens | ~$${costWithout.toFixed(6)}`);
  console.log(`WITH decision engine:     ${totalWithMs}ms total | ${totalWithTokens} tokens | ~$${costWith.toFixed(6)}`);
  console.log(`\nSpeedup: ${(totalWithoutMs / totalWithMs).toFixed(1)}x faster | Cost reduction: ${(costWithout / costWith).toFixed(1)}x cheaper\n`);
}

run();
