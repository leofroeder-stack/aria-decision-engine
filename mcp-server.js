#!/usr/bin/env node
/**
 * MCP server wrapper for aria-decision-engine.
 * Exposes the `decide` tool over the Model Context Protocol (stdio transport),
 * so any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Hermes,
 * OpenClaw, etc.) can call it as a native tool.
 *
 * Run directly: node mcp-server.js
 * Or via npx:   npx --yes git+https://github.com/leofroeder-stack/aria-decision-engine.git aria-decision-engine-mcp
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { decide } from './index.js';

const server = new Server(
  { name: 'aria-decision-engine', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'decide',
      description:
        'Fast structured decision engine (Groq JSON mode, ~85ms, ~$0.00004/call). Use for binary/categorical/score classifications instead of full reasoning: email triage, urgency scoring, spam detection, DTC/fault severity, content filtering.',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'The text/context to classify' },
          schema_description: {
            type: 'string',
            description:
              "Plain-language description of the expected JSON schema, e.g. \"{urgency: 'low'|'high', is_spam: bool}\"",
          },
          examples: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional few-shot examples to improve accuracy',
          },
        },
        required: ['input', 'schema_description'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  if (name !== 'decide') throw new Error(`Unknown tool: ${name}`);

  const result = await decide({
    input: args.input,
    schemaDescription: args.schema_description,
    examples: args.examples || [],
    apiKey: process.env.GROQ_API_KEY,
  });

  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
