# Local Memory - OpenCode Local Memory Plugin

A local memory service for OpenCode that helps AI remember your preferences, history, and context.

## Why This Project?

### OpenCode Lacks Memory Functionality

OpenCode is a powerful AI coding assistant, but it **does not have built-in vector memory**. This means:

- Each conversation is independent - the AI can't remember your preferences and history
- You need to repeat project context and requirements
- Long-term user profiles cannot be built

### Limitations of Existing Solutions

While existing solutions like **Supermemory** provide memory functionality:

- Data is stored in the cloud, posing privacy risks
- Depends on third-party services, cannot fully control your data
- Higher pricing ($19/month+)

### Our Philosophy: Data Sovereignty

Similar to **OpenClaw**, we believe:

> **User data should be completely controlled by users themselves**

Memory is highly private and important information, including:
- Your technical preferences and habits
- Project architecture and decisions
- Your workflow and tool choices
- Personal configurations

This data should never be uploaded to any cloud server - it must be stored entirely on your own machine.

## Core Features

- ✅ **Local Storage** - All data stored in local PostgreSQL database
- ✅ **Vector Search** - Semantic understanding, not just keyword matching
- ✅ **Fully Open Source** - Transparent code, no black boxes
- ✅ **Zero Cost** - Free to use
- ✅ **Privacy First** - Data never leaves your machine

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         OpenCode                                 │
│                                                                  │
│  ┌──────────────┐          ┌──────────────────────────────────┐  │
│  │   User       │          │     MCP Server                   │  │
│  │   Input      │─────────►│  - memory_save                  │  │
│  │              │◄─────────│  - memory_recall                │  │
│  └──────────────┘          └─────────────┬────────────────────┘  │
│                                          │                       │
└──────────────────────────────────────────│───────────────────────┘
                                           │ stdio
                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Local Memory API Server                       │
│  ┌────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │   Hono         │───►│  Embedding      │───►│  PostgreSQL  │  │
│  │   (Bun)        │    │  Service        │    │  + pgvector  │  │
│  └────────────────┘    └────────┬────────┘    └──────────────┘  │
│                                  │                                │
│                                  ▼                                │
│                         ┌─────────────────┐                      │
│                         │  Ollama         │                      │
│                         │  nomic-embed-   │                      │
│                         │  text           │                      │
│                         └─────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| Runtime | Bun | Fast JavaScript runtime |
| API Framework | Hono | Lightweight web framework |
| Database | PostgreSQL + pgvector | Vector database |
| Embedding | Ollama + nomic-embed-text | Local vector generation |
| Integration | MCP SDK | Model Context Protocol |

## Quick Start

### Method 1: One-Click Installation (Recommended)

```bash
# Clone the project
git clone https://github.com/jqlong17/local-memory.git
cd local-memory

# Run the installation script
./install.sh
```

The script will automatically:
1. Check and install Bun (if not installed)
2. Install project dependencies
3. Start PostgreSQL + pgvector container
4. Start Ollama service and download embedding model
5. Initialize database
6. Start API service
7. Configure OpenCode MCP

### Method 2: Manual Installation

#### Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://docker.com) installed (for PostgreSQL)
- [Ollama](https://ollama.com) installed (for local Embedding)

#### 1. Install Dependencies

```bash
# Start PostgreSQL + pgvector
docker run -d --name memory-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=memory \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Enable vector extension
docker exec memory-db psql -U postgres -d memory -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Install Ollama and embedding model
brew install ollama
ollama pull nomic-embed-text
```

#### 2. Clone and Setup

```bash
git clone https://github.com/jqlong17/local-memory.git
cd local-memory
bun install
bun run db:push
bun run start
```

#### 3. Configure OpenCode

```bash
# Add MCP server
opencode mcp add
```

Follow the prompts:
- Server name: `local-memory`
- Command: `bun`
- Args: `/path/to/local-memory/src/mcp.ts`

#### 4. Restart OpenCode

```bash
opencode
```

## Usage

### Save Memory

When you want the AI to remember something, just tell it:

```
Remember I prefer using Ghostty as terminal
```

```
Save: This project uses React + TypeScript + Vite
```

The AI will automatically call the `memory_save` tool to store the information in the local database.

### Recall Memory

When you need to recall previous preferences or settings, just ask the AI:

```
What terminal did I use before?
```

```
Find user's tech stack preferences
```

### Auto-Trigger

The MCP tools are configured with detailed trigger rules - the AI will automatically determine when to save or recall memories:

**Save Triggers:**
- "Remember", "Save", "Store"
- Mentions of personal preferences, habits, tools

**Recall Triggers:**
- "I used to...", "Before"
- Questions about preferences, tech stack

## FAQ

### Q: Is data really stored completely locally?

**A: Yes!** All data is stored in your own PostgreSQL database, never uploaded to the cloud.

### Q: How much disk space is needed?

**A:**
- PostgreSQL base: ~50MB
- Each memory: ~1KB (including text and 768-dim vector)

### Q: Which embedding models are supported?

**A:** All Ollama-available models are supported. Recommended: `nomic-embed-text` (274MB).

### Q: How to view saved memories?

```bash
# Enter database
docker exec -it memory-db psql -U postgres -d memory

# Query memories
SELECT id, content, created_at FROM memories;
```

### Q: How to backup memories?

```bash
# Export database
docker exec memory-db pg_dump -U postgres memory > memory_backup.sql

# Import database
docker exec -i memory-db psql -U postgres memory < memory_backup.sql
```

## Comparison with Cloud Solutions

| Feature | Local Memory | Supermemory |
|---------|--------------|-------------|
| Data Storage | Local | Cloud |
| Data Control | Fully controlled | Depends on third party |
| Price | Free | $19/month+ |
| Embedding | Local model | Cloudflare AI |
| Privacy | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## Development

```bash
# Development mode (hot reload)
bun run dev

# Run tests
bun test

# Build
bun build
```

## Contributing

Issues and Pull Requests are welcome!

## License

MIT License
