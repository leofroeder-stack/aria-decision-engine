// Example 1 — Email triage
// Run: GROQ_API_KEY=gsk_... node examples/email-triage.js
import { decide } from '../index.js';

const result = await decide({
  input: 'From: recruiter@trucking-jobs.com | Subject: CDL Driver Position | We have an opening, competitive pay and benefits.',
  schemaDescription: "{category: 'billing'|'recruiting'|'marketing'|'support'|'other', needs_action: bool, spam_likelihood: number 0-1}",
  apiKey: process.env.GROQ_API_KEY,
});

console.log(JSON.stringify(result, null, 2));
