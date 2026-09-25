#!/usr/bin/env node
// Interactive playground for aria-decision-engine.
// Pick a real-world preset scenario, or type your own input/schema, and see live results.
//
// Run: GROQ_API_KEY=gsk_... node examples/playground.js
// Or:  npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git aria-decision-engine-playground
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { decide } from '../index.js';

const rl = readline.createInterface({ input: stdin, output: stdout });

const PRESETS = [
  {
    label: 'Email triage',
    input: 'From: recruiter@trucking-jobs.com | Subject: CDL Driver Position | We have an opening, competitive pay and benefits.',
    schema: "{category: 'billing'|'recruiting'|'marketing'|'support'|'other', needs_action: bool, spam_likelihood: number 0-1}",
  },
  {
    label: 'Fleet fault / DTC severity',
    input: 'SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected',
    schema: "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}",
  },
  {
    label: 'Support ticket urgency',
    input: 'The app crashes every time I open settings.',
    schema: "{urgency_score: number 1-10, category: 'bug'|'feature_request'|'question'}",
    examples: ['App is completely down for all users -> urgency_score: 10, category: bug', 'Could you add dark mode? -> urgency_score: 2, category: feature_request'],
  },
  {
    label: 'Billing / churn risk',
    input: 'We were billed twice, please refund today or we cancel our contract.',
    schema: "{department: 'billing'|'technical'|'other', urgency: 'low'|'medium'|'high', churn_risk: bool}",
  },
  {
    label: 'Spam filter',
    input: 'CONGRATULATIONS!!! You have WON a $1000 gift card, click here NOW to claim before it expires!!!',
    schema: '{is_spam: bool, confidence: number 0-1}',
  },
];

function banner() {
  console.log('\n\x1b[35m=== aria-decision-engine PLAYGROUND ===\x1b[0m');
  console.log('Try real classification scenarios live against the Groq API.\n');
}

async function ensureApiKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  console.log('No GROQ_API_KEY found in your environment.');
  console.log('Get a free one at https://console.groq.com/keys\n');
  const key = await rl.question('Paste your Groq API key (used only for this session): ');
  return key.trim();
}

function printMenu() {
  console.log('Choose a scenario:');
  PRESETS.forEach((p, i) => console.log(`  ${i + 1}) ${p.label}`));
  console.log(`  ${PRESETS.length + 1}) Custom — type your own input + schema`);
  console.log('  0) Exit\n');
}

async function runOne(apiKey, { input, schema, examples }) {
  console.log(`\n\x1b[36mInput:\x1b[0m ${input}`);
  console.log(`\x1b[36mSchema:\x1b[0m ${schema}`);
  console.log('Calling Groq...');
  try {
    const result = await decide({ input, schemaDescription: schema, examples: examples || [], apiKey });
    console.log(`\x1b[32mDecision:\x1b[0m ${JSON.stringify(result.decision, null, 2)}`);
    console.log(`\x1b[90m(${result.latency_ms}ms, ${result.tokens_used} tokens, model: ${result.model})\x1b[0m\n`);
  } catch (err) {
    console.log(`\x1b[31mError:\x1b[0m ${err.message}\n`);
  }
}

async function main() {
  banner();
  const apiKey = await ensureApiKey();
  if (!apiKey) {
    console.log('No API key provided. Exiting.');
    rl.close();
    return;
  }

  while (true) {
    printMenu();
    const choice = (await rl.question('> ')).trim();
    if (choice === '0') break;

    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && idx < PRESETS.length) {
      await runOne(apiKey, PRESETS[idx]);
    } else if (idx === PRESETS.length) {
      const input = await rl.question('Your input text: ');
      const schema = await rl.question("Your schema description (e.g. \"{is_spam: bool}\"): ");
      await runOne(apiKey, { input, schema });
    } else {
      console.log('Invalid choice.\n');
    }
  }

  console.log('\nThanks for trying aria-decision-engine!');
  rl.close();
}

main();
