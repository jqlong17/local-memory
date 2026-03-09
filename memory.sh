#!/bin/bash

# Local Memory 服务管理脚本
# 用法: ./memory.sh [start|stop|restart|status|logs]

SERVICE_NAME="local-memory"
ECOSYSTEM_FILE="/Users/ruska/开源项目/local-memory/ecosystem.config.cjs"
PORT=40640

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

case "$1" in
  start)
    echo -e "${GREEN}正在启动 Local Memory 服务...${NC}"
    cd /Users/ruska/开源项目/local-memory
    pm2 start ecosystem.config.cjs --env production
    sleep 2
    if curl -s http://localhost:${PORT}/ > /dev/null; then
      echo -e "${GREEN}✅ 服务已启动，运行在端口 ${PORT}${NC}"
    else
      echo -e "${RED}❌ 服务启动失败${NC}"
      exit 1
    fi
    ;;
    
  stop)
    echo -e "${YELLOW}正在停止 Local Memory 服务...${NC}"
    pm2 stop ${SERVICE_NAME}
    echo -e "${GREEN}✅ 服务已停止${NC}"
    ;;
    
  restart)
    echo -e "${YELLOW}正在重启 Local Memory 服务...${NC}"
    pm2 restart ${SERVICE_NAME}
    sleep 2
    if curl -s http://localhost:${PORT}/ > /dev/null; then
      echo -e "${GREEN}✅ 服务已重启，运行在端口 ${PORT}${NC}"
    else
      echo -e "${RED}❌ 服务重启失败${NC}"
      exit 1
    fi
    ;;
    
  status)
    echo -e "${YELLOW}Local Memory 服务状态:${NC}"
    pm2 status ${SERVICE_NAME}
    echo ""
    echo -e "${YELLOW}端口 ${PORT} 检测:${NC}"
    if curl -s http://localhost:${PORT}/ > /dev/null; then
      echo -e "${GREEN}✅ 端口 ${PORT} 正常响应${NC}"
    else
      echo -e "${RED}❌ 端口 ${PORT} 无响应${NC}"
    fi
    ;;
    
  logs)
    echo -e "${YELLOW}查看 Local Memory 日志 (按 Ctrl+C 退出)...${NC}"
    pm2 logs ${SERVICE_NAME}
    ;;
    
  setup-autostart)
    echo -e "${YELLOW}配置开机自启...${NC}"
    echo "请执行以下命令（需要输入密码）:"
    echo -e "${GREEN}sudo env PATH=\$PATH:/opt/homebrew/Cellar/node/25.6.1_1/bin /opt/homebrew/lib/node_modules/pm2/bin/pm2 startup launchd -u ruska --hp /Users/ruska${NC}"
    echo ""
    echo "执行完后，运行:"
    echo -e "${GREEN}pm2 save${NC}"
    ;;
    
  test)
    echo -e "${YELLOW}测试 Local Memory API:${NC}"
    curl -s http://localhost:${PORT}/ | jq .
    ;;
    
  *)
    echo "Local Memory 服务管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start          启动服务"
    echo "  stop           停止服务"
    echo "  restart        重启服务"
    echo "  status         查看状态"
    echo "  logs           查看日志"
    echo "  test           测试 API"
    echo "  setup-autostart 显示开机自启配置命令"
    echo ""
    echo "当前配置:"
    echo "  端口: ${PORT}"
    echo "  项目路径: /Users/ruska/开源项目/local-memory"
    echo "  数据库: /Users/ruska/开源项目/local-memory/memory.db"
    ;;
esac
