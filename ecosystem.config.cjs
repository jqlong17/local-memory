module.exports = {
  apps: [
    {
      name: 'local-memory',
      script: 'bun',
      args: 'run start',
      cwd: '/Users/ruska/开源项目/local-memory',
      env: {
        NODE_ENV: 'production',
        PORT: 40640
      },
      // 进程管理配置
      instances: 1,
      exec_mode: 'fork',
      // 自动重启
      autorestart: true,
      // 崩溃后重启延迟
      restart_delay: 3000,
      // 内存限制（超过则重启）
      max_memory_restart: '500M',
      // 日志配置
      log_file: '/Users/ruska/.local/share/local-memory/combined.log',
      out_file: '/Users/ruska/.local/share/local-memory/out.log',
      err_file: '/Users/ruska/.local/share/local-memory/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 开机自启配置
      pmx: false,
      // 监控配置
      min_uptime: '10s',
      max_restarts: 5,
      // kill 信号
      kill_timeout: 5000,
      // 监听端口变化（开发模式）
      watch: false,
      // 忽略的文件
      ignore_watch: ['node_modules', 'memory.db', '*.log'],
      // 环境变量映射（可选）
      env_production: {
        NODE_ENV: 'production',
        PORT: 40640
      }
    }
  ]
};
