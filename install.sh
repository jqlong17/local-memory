#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Local Memory 一键安装脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Check and install Bun
echo -e "\n${YELLOW}[1/5] 检查 Bun...${NC}"
if command -v bun &> /dev/null; then
    echo -e "${GREEN}✓ Bun 已安装: $(bun --version)${NC}"
else
    echo -e "${YELLOW}安装 Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Step 2: Install dependencies
echo -e "\n${YELLOW}[2/5] 安装项目依赖...${NC}"
bun install

# Step 3: Check and start Ollama
echo -e "\n${YELLOW}[3/5] 检查 Ollama...${NC}"
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓ Ollama 已安装${NC}"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434 &> /dev/null; then
        echo -e "${GREEN}✓ Ollama 服务已在运行${NC}"
    else
        echo -e "${YELLOW}启动 Ollama 服务...${NC}"
        ollama serve &
        sleep 3
    fi
    
    # Pull embedding model if not exists
    echo -e "${YELLOW}检查 embedding 模型...${NC}"
    if ollama list | grep -q "nomic-embed-text"; then
        echo -e "${GREEN}✓ nomic-embed-text 模型已存在${NC}"
    else
        echo -e "${YELLOW}下载 nomic-embed-text 模型（~274MB）...${NC}"
        ollama pull nomic-embed-text
    fi
else
    echo -e "${YELLOW}安装 Ollama...${NC}"
    brew install ollama
    ollama serve &
    sleep 3
    echo -e "${YELLOW}下载 nomic-embed-text 模型...${NC}"
    ollama pull nomic-embed-text
fi

# Step 4: Initialize SQLite database
echo -e "\n${YELLOW}[4/5] 初始化 SQLite 数据库...${NC}"
if [ -f "$SCRIPT_DIR/memory.db" ]; then
    echo -e "${GREEN}✓ 数据库已存在${NC}"
else
    echo -e "${YELLOW}创建数据库...${NC}"
    touch "$SCRIPT_DIR/memory.db"
fi

# Start API server
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  启动 Local Memory API 服务${NC}"
echo -e "${GREEN}========================================${NC}"

# Kill existing process on port 3002
if lsof -ti:3002 &> /dev/null; then
    echo -e "${YELLOW}关闭占用 3002 端口的进程...${NC}"
    lsof -ti:3002 | xargs kill 2>/dev/null || true
fi

echo -e "${GREEN}✓ API 服务已启动: http://localhost:3002${NC}"
echo -e "${GREEN}✓ Health Check: http://localhost:3002/${NC}"

# Configure OpenCode MCP
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  配置 OpenCode MCP${NC}"
echo -e "${GREEN}========================================${NC}"

# Get MCP path
MCP_PATH="$SCRIPT_DIR/src/mcp.ts"

# Check if opencode config exists
CONFIG_DIR="$HOME/.config/opencode"
CONFIG_FILE="$CONFIG_DIR/opencode.json"

mkdir -p "$CONFIG_DIR"

if [ -f "$CONFIG_FILE" ]; then
    if grep -q "local-memory" "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ OpenCode MCP 已配置${NC}"
    else
        echo -e "${YELLOW}添加 MCP 配置到 OpenCode...${NC}"
        python3 -c "
import json
import sys

with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)

if 'mcp' not in config:
    config['mcp'] = {}

config['mcp']['local-memory'] = {
    'type': 'local',
    'command': ['bun', '$MCP_PATH'],
    'environment': {'MEMORY_API': 'http://localhost:3002'},
    'enabled': True
}

with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)

print('MCP 配置已添加')
"
    fi
else
    echo -e "${YELLOW}创建 OpenCode 配置...${NC}"
    cat > "$CONFIG_FILE" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "mcp": {
    "local-memory": {
      "type": "local",
      "command": ["bun", "$MCP_PATH"],
      "environment": {
        "MEMORY_API": "http://localhost:3002"
      },
      "enabled": true
    }
  }
}
EOF
fi

# Test API
echo -e "\n${YELLOW}测试 API 服务...${NC}"
sleep 2
if curl -s http://localhost:3002/ &> /dev/null; then
    echo -e "${GREEN}✓ API 服务测试成功${NC}"
else
    echo -e "${RED}✗ API 服务测试失败${NC}"
    echo -e "${YELLOW}手动启动: cd $SCRIPT_DIR && bun run start${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "服务状态:"
echo -e "  - API:     http://localhost:3002"
echo -e "  - Health:  http://localhost:3002/"
echo -e "  - MCP:     $MCP_PATH"
echo -e "  - 数据库:   $SCRIPT_DIR/memory.db"
echo ""
echo -e "下一步:"
echo -e "  1. 重启 OpenCode: opencode"
echo -e "  2. 使用 memory_save 保存记忆"
echo -e "  3. 使用 memory_recall 搜索记忆"
echo ""
