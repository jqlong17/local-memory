import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const MEMORY_API = process.env.MEMORY_API || 'http://localhost:3002';

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
        description: `Save important information to long-term memory. Use this tool when:
- User explicitly asks to "记住", "保存", "记下来", "存储" something
- User mentions their preferences, habits, or personal information
- User shares their technical stack, tools, or workflows
- User provides context that should be remembered for future sessions
- Any information the user wants to retain across conversations

Examples:
- "记住我喜欢用 TypeScript"
- "保存这个项目使用 React + Vite"
- "记下来用户偏好深色主题"`,
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to remember - should be a clear, complete sentence describing what to remember',
            },
            userId: {
              type: 'string',
              description: 'User identifier (optional, defaults to "default")',
              default: 'default',
            },
            projectId: {
              type: 'string',
              description: 'Project identifier for project-specific memories (optional)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'memory_recall',
        description: `Search for relevant memories from long-term memory. Use this tool when:
- User asks about their preferences, habits, or past decisions
- User asks "我之前", "我记得", "以前" something
- User asks about their technical stack, tools, or workflows
- Starting a new conversation and you want to know user's context
- Any question that could benefit from knowing user's history

Examples:
- "用户使用什么终端？"
- "我之前是怎么配置这个项目的？"
- "用户的编程语言偏好是什么？"
- 当不确定用户偏好时，自动检索`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query in natural language - describe what you want to find',
            },
            userId: {
              type: 'string',
              description: 'User identifier (optional, defaults to "default")',
              default: 'default',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (optional, defaults to 5)',
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
