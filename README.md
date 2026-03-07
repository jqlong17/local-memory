# Local Memory - OpenCode 本地记忆插件

为 OpenCode 打造的本地记忆服务，让 AI 记住你的偏好、历史和上下文。

## 为什么需要这个项目？

### OpenCode 缺少记忆功能

OpenCode 是一个强大的 AI 编程助手，但它**没有内置的向量记忆功能**。这意味着：

- 每次对话都是独立的，AI 无法记住你的偏好和历史
- 需要重复解释项目背景和需求
- 无法建立长期的用户画像

### 现有方案的局限性

现有的解决方案如 **Supermemory** 虽然提供记忆功能，但：

- 数据存储在云端，存在隐私风险
- 依赖第三方服务，无法完全控制自己的数据
- 收费较高（$19/月起）

类似的项目还有 [OpenViking](https://github.com/volcengine/OpenViking)（火山引擎出品），但同样需要云端部署。

### 我们的理念：数据自主

与 **OpenClaw** 的理念类似，我们坚信：

> **用户的数据应该完全由用户自己控制**

记忆是非常私密且重要的信息，包含：
- 你的技术偏好和习惯
- 项目的架构和决策
- 你的工作流程和工具选择
- 个人配置和设置

这些数据不应该被上传到任何云服务器，必须完完全全保存在你自己的电脑上。

## 核心特性

- ✅ **本地存储** - 所有数据保存在本地 PostgreSQL 数据库
- ✅ **向量搜索** - 使用语义理解，而非简单的关键词匹配
- ✅ **完全开源** - 代码完全透明，无黑盒
- ✅ **零成本** - 无需付费，完全免费使用
- ✅ **隐私优先** - 数据永不离开你的电脑

## 技术架构

### 系统架构图

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
│                     Local Memory API Server                      │
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

### 数据流

```
1. 用户输入
       │
       ▼
2. OpenCode 调用 MCP 工具
       │
       ▼
3. MCP Server 接收请求
       │
       ├──► memory_save: 发送内容到 API Server
       │
       └──► memory_recall: 发送查询到 API Server
                    │
                    ▼
4. API Server 调用 Ollama 生成向量
                    │
                    ▼
5. PostgreSQL 向量搜索
                    │
                    ▼
6. 返回结果到 OpenCode
```

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 运行时 | Bun | 快速的 JavaScript 运行时 |
| API 框架 | Hono | 轻量级 Web 框架 |
| 数据库 | PostgreSQL + pgvector | 向量数据库 |
| Embedding | Ollama + nomic-embed-text | 本地向量生成 |
| 集成 | MCP SDK | Model Context Protocol |

## 快速开始

### 前置要求

- [Bun](https://bun.sh) 已安装
- [Docker](https://docker.com) 已安装（用于 PostgreSQL）
- [Ollama](https://ollama.com) 已安装（用于本地 Embedding）

### 1. 安装依赖

```bash
# 启动 PostgreSQL + pgvector
docker run -d --name memory-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=memory \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 启用向量扩展
docker exec memory-db psql -U postgres -d memory -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 安装 Ollama 和 embedding 模型
brew install ollama
ollama pull nomic-embed-text
```

### 2. 克隆项目

```bash
git clone https://github.com/jqlong17/local-memory.git
cd local-memory
```

### 3. 安装并初始化

```bash
# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动 API 服务
bun run start
```

### 4. 配置 OpenCode

```bash
# 添加 MCP 服务器
opencode mcp add
```

按照提示输入：
- Server name: `local-memory`
- Command: `bun`
- Args: `/path/to/local-memory/src/mcp.ts`

或者手动编辑 `~/.config/opencode/opencode.json`：

```json
{
  "mcp": {
    "local-memory": {
      "type": "local",
      "command": ["bun", "/path/to/local-memory/src/mcp.ts"],
      "environment": {
        "MEMORY_API": "http://localhost:3002"
      },
      "enabled": true
    }
  }
}
```

### 5. 重启 OpenCode

```bash
# 停止当前 OpenCode 并重新启动
opencode
```

## 使用方法

### 保存记忆

当你想让 AI 记住某些内容时，直接告诉它：

```
记住我喜欢用 Ghostty 作为终端
```

```
保存：我这个项目使用 React + TypeScript + Vite
```

AI 会自动调用 `memory_save` 工具将信息存储到本地数据库。

### 检索记忆

当需要回忆之前的偏好或设置时，直接问 AI：

```
我之前用的终端是什么？
```

```
查找用户的技术栈偏好
```

AI 会自动调用 `memory_recall` 工具搜索相关记忆。

### 自动触发

MCP 工具已配置详细的触发规则，AI 会自动判断何时需要保存或检索记忆：

**保存触发**：
- "记住"、"保存"、"记下来"、"存储"
- 提到个人偏好、习惯、工具

**检索触发**：
- "我之前..."、"以前"
- 询问偏好、技术栈

## 常见问题

### Q: 数据真的完全保存在本地吗？

**A: 是的！** 所有数据都存储在你自己的 PostgreSQL 数据库中，完全不上传云端。

### Q: 需要多少磁盘空间？

**A:** 
- PostgreSQL 基础: ~50MB
- 每条记忆: ~1KB（包含文本和 768 维向量）

### Q: 支持哪些 Embedding 模型？

**A:** 支持所有 Ollama 可用模型，推荐 `nomic-embed-text`（274MB）。

### Q: 如何查看已保存的记忆？

```bash
# 进入数据库
docker exec -it memory-db psql -U postgres -d memory

# 查询记忆
SELECT id, content, created_at FROM memories;
```

### Q: 如何备份记忆？

```bash
# 导出数据库
docker exec memory-db pg_dump -U postgres memory > memory_backup.sql

# 导入数据库
docker exec -i memory-db psql -U postgres memory < memory_backup.sql
```

## 与云端方案对比

| 特性 | Local Memory | Supermemory |
|------|--------------|-------------|
| 数据存储 | 本地 | 云端 |
| 数据控制 | 完全自主 | 依赖第三方 |
| 价格 | 免费 | $19/月起 |
| Embedding | 本地模型 | Cloudflare AI |
| 隐私 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## 开发

```bash
# 开发模式（热重载）
bun run dev

# 运行测试
bun test

# 构建
bun build
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT License
