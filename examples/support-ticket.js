// Example 3 — Support ticket urgency (with few-shot examples for better accuracy)
// Run: GROQ_API_KEY=gsk_... node examples/support-ticket.js
import { decide } from '../index.js';

const result = await decide({
  input: 'The app crashes every time I open settings.',
  schemaDescription: "{urgency_score: number 1-10, category: 'bug'|'feature_request'|'question'}",
  examples: [
    'App is completely down for all users -> urgency_score: 10, category: bug',
    'Could you add dark mode? -> urgency_score: 2, category: feature_request',
  ],
  apiKey: process.env.GROQ_API_KEY,
});

console.log(JSON.stringify(result, null, 2));
