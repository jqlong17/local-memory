# Local Memory - OpenCode Plugin

本地记忆服务，为 OpenCode 提供长期记忆功能。

## 功能

- `memory_save` - 保存重要信息到长期记忆
- `memory_recall` - 搜索相关记忆

## 快速开始

### 1. 安装依赖

```bash
# 安装 PostgreSQL + pgvector
docker run -d --name supermemory-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=supermemory -p 5432:5432 pgvector/pgvector:pg16

# 启用 pgvector
docker exec supermemory-db psql -U postgres -d supermemory -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 安装 Ollama 和 embedding 模型
brew install ollama
ollama pull nomic-embed-text
```

### 2. 初始化数据库

```bash
cd local-memory
bun install
bun run db:push
```

### 3. 启动服务

```bash
# 启动 API 服务
bun run start

# 启动 MCP 服务器
bun run mcp
```

### 4. 配置 OpenCode

在 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "mcp": {
    "local-memory": {
      "command": "bun",
      "args": ["/path/to/local-memory/src/mcp.ts"],
      "env": {
        "MEMORY_API": "http://localhost:3001"
      }
    }
  }
}
```

## 使用

### 保存记忆
```
使用 memory_save 工具保存：用户喜欢用 Ghostty 终端
```

### 搜索记忆
```
使用 memory_recall 工具搜索：用户使用什么终端？
```

## 发布到插件市场

```bash
# 安装 marketplace 工具
bunx opencode-marketplace install https://github.com/你的用户名/local-memory
```

## 技术栈

- Bun + Hono (API 服务)
- PostgreSQL + pgvector (向量数据库)
- Ollama + nomic-embed-text (本地 Embedding)
- MCP SDK (OpenCode 集成)

## License

MIT
