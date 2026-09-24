// Example 2 — Fleet fault / DTC severity
// Run: GROQ_API_KEY=gsk_... node examples/dtc-severity.js
import { decide } from '../index.js';

const result = await decide({
  input: 'SPN 190 FMI 0 - Engine Speed High - Most Severe fault level detected',
  schemaDescription: "{severity: 'critical'|'warning'|'informational', requires_shutdown: bool}",
  apiKey: process.env.GROQ_API_KEY,
});

console.log(JSON.stringify(result, null, 2));
