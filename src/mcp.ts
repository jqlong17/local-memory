import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const MEMORY_API = process.env.MEMORY_API || 'http://localhost:3001';

const server = new Server(
  {
    name: 'local-memory',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'memory_save',
        description: 'Save important information to long-term memory',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to remember',
            },
            userId: {
              type: 'string',
              description: 'User identifier',
              default: 'default',
            },
            projectId: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'memory_recall',
        description: 'Search for relevant memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            userId: {
              type: 'string',
              description: 'User identifier',
              default: 'default',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'memory_save') {
      const response = await fetch(`${MEMORY_API}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: args.content,
          userId: args.userId || 'default',
          projectId: args.projectId,
        }),
      });
      const result = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: `Memory saved successfully! ID: ${result.id}`,
          },
        ],
      };
    }

    if (name === 'memory_recall') {
      const response = await fetch(`${MEMORY_API}/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: args.query,
          userId: args.userId || 'default',
          limit: args.limit || 5,
        }),
      });
      const result = await response.json();
      const memories = result.memories?.rows || [];
      
      if (memories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No relevant memories found.',
            },
          ],
        };
      }

      const formatted = memories.map((m: any) => `- ${m.content}`).join('\n');
      return {
        content: [
          {
            type: 'text',
            text: `Found ${memories.length} relevant memories:\n${formatted}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      };
    }
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
