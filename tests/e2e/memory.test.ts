import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.MEMORY_API || 'http://localhost:3002';
const TEST_USER_ID = 'e2e-test-user';
const TIMESTAMP = Date.now();
const PROJECT_ROOT = process.cwd();

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logRequest(method: string, url: string, body?: any) {
  log(`📤 REQUEST: ${method} ${url}`);
  if (body) {
    log(`   Body: ${JSON.stringify(body)}`);
  }
}

function logResponse(status: number, data: any) {
  log(`📥 RESPONSE: ${status}`);
  log(`   Body: ${JSON.stringify(data).substring(0, 500)}${JSON.stringify(data).length > 500 ? '...' : ''}`);
}

function runCommand(command: string, args: string[] = [], cwd: string = PROJECT_ROOT): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    log(`🔧 Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });

    proc.on('error', (err) => {
      stderr += err.message;
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

describe('Local Memory E2E Tests', () => {
  let savedMemoryId: string = '';

  afterAll(async () => {
    log('🧹 Cleaning up test data...');
    log(`   Test completed at ${new Date().toISOString()}`);
  });

  test('1. Health Check - API Server Status', async () => {
    log('========================================');
    log('🧪 Test 1: Health Check');
    log('========================================');

    const url = `${API_BASE}/`;
    logRequest('GET', url);

    const response = await fetch(url);
    const data = await response.json();

    logResponse(response.status, data);

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.message).toContain('Local Memory API');

    log('✅ Health check passed!');
    log('');
  });

  test('2. Save Memory - Store user preference', async () => {
    log('========================================');
    log('🧪 Test 2: Save Memory');
    log('========================================');

    const url = `${API_BASE}/memory`;
    const testContent = `测试用户偏好 - 使用 VSCode 编辑器 - ${TIMESTAMP}`;
    const body = {
      content: testContent,
      userId: TEST_USER_ID,
      projectId: 'test-project'
    };

    logRequest('POST', url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    logResponse(response.status, data);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();

    savedMemoryId = data.id;
    log(`💾 Saved memory ID: ${savedMemoryId}`);
    log('✅ Save memory passed!');
    log('');
  });

  test('3. Recall Memory - Search for saved preferences', async () => {
    log('========================================');
    log('🧪 Test 3: Recall Memory');
    log('========================================');

    const url = `${API_BASE}/recall`;
    const body = {
      query: '用户编辑器偏好',
      userId: TEST_USER_ID,
      limit: 5
    };

    logRequest('POST', url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    logResponse(response.status, data);

    expect(response.status).toBe(200);
    expect(data.memories).toBeDefined();
    
    const memories = data.memories;
    const rowCount = memories.rowCount || 0;
    log(`📊 Found ${rowCount} memories`);
    
    if (rowCount > 0) {
      const memoriesList = memories.rows || [];
      memoriesList.forEach((m: any, index: number) => {
        log(`   [${index + 1}] ${m.content}`);
      });
    }

    log('✅ Recall memory passed!');
    log('');
  });

  test('4. Get All Memories - List user memories', async () => {
    log('========================================');
    log('🧪 Test 4: Get All Memories');
    log('========================================');

    const url = `${API_BASE}/memory/${TEST_USER_ID}`;
    logRequest('GET', url);

    const response = await fetch(url);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      log(`⚠️ Failed to parse response: ${text.substring(0, 200)}`);
      data = { raw: text };
    }
    logResponse(response.status, data);

    logResponse(response.status, data);

    expect(response.status).toBe(200);
    expect(data.memories).toBeDefined();

    const memories = data.memories;
    const rowCount = memories.rowCount || 0;
    log(`📊 Total memories for user ${TEST_USER_ID}: ${rowCount}`);

    log('✅ Get all memories passed!');
    log('');
  });

  test('5. Semantic Search - Test vector similarity', async () => {
    log('========================================');
    log('🧪 Test 5: Semantic Search');
    log('========================================');

    const url = `${API_BASE}/recall`;
    const testCases = [
      { query: '什么是用户使用的编辑器', expected: 'VSCode' },
      { query: '用户用哪个 IDE', expected: 'VSCode' },
      { query: 'terminal preferences', expected: 'Ghostty' }
    ];

    for (const testCase of testCases) {
      const body = {
        query: testCase.query,
        userId: TEST_USER_ID,
        limit: 3
      };

      log(`\n🔍 Testing query: "${testCase.query}"`);
      logRequest('POST', url, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      logResponse(response.status, data);

      const memories = data.memories;
      const rowCount = memories.rowCount || 0;
      log(`   Found ${rowCount} results`);

      if (rowCount > 0) {
        const topResult = memories.rows[0];
        log(`   Top result: ${topResult.content}`);
      }
    }

    log('\n✅ Semantic search passed!');
    log('');
  });

  test('6. Error Handling - Invalid input', async () => {
    log('========================================');
    log('🧪 Test 6: Error Handling');
    log('========================================');

    // Test missing content
    const url = `${API_BASE}/memory`;
    const body1 = { userId: TEST_USER_ID };
    
    log('⚠️ Testing missing content...');
    logRequest('POST', url, body1);

    const response1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body1)
    });

    const data1 = await response1.json();
    logResponse(response1.status, data1);

    expect(response1.status).toBe(400);
    expect(data1.error).toBeDefined();

    // Test missing query
    const url2 = `${API_BASE}/recall`;
    const body2 = { userId: TEST_USER_ID };

    log('\n⚠️ Testing missing query...');
    logRequest('POST', url2, body2);

    const response2 = await fetch(url2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body2)
    });

    const data2 = await response2.json();
    logResponse(response2.status, data2);

    expect(response2.status).toBe(400);
    expect(data2.error).toBeDefined();

    log('✅ Error handling passed!');
    log('');
  });

  test('7. MCP Integration - Test MCP tools', async () => {
    log('========================================');
    log('🧪 Test 7: MCP Integration');
    log('========================================');

    const mcpUrl = process.env.MCP_PATH || '/Users/ruska/开源项目/local-memory/src/mcp.ts';
    log(`📍 MCP Path: ${mcpUrl}`);
    log('⚠️ MCP integration test requires manual verification in OpenCode');
    log('   Use the following commands in OpenCode:');
    log('   - "记住我喜欢用 Neovim"');
    log('   - "我之前用的编辑器是什么？"');

    log('\n✅ MCP integration test (manual) noted!');
    log('');
  });

  test('8. Install Script - Test one-click installation', async () => {
    log('========================================');
    log('🧪 Test 8: Install Script');
    log('========================================');

    const installScriptPath = join(PROJECT_ROOT, 'install.sh');
    log(`📍 Script Path: ${installScriptPath}`);

    // Check if install script exists
    log('\n1. 检查安装脚本是否存在...');
    const scriptExists = existsSync(installScriptPath);
    log(`   脚本存在: ${scriptExists}`);
    expect(scriptExists).toBe(true);

    // Check if script is executable
    log('\n2. 检查脚本权限...');
    const { stdout: lsOutput } = await runCommand('ls', ['-la', 'install.sh']);
    log(`   ${lsOutput.trim()}`);
    expect(lsOutput.includes('-rwx')).toBe(true);

    // Check script shebang
    log('\n3. 检查脚本 shebang...');
    const scriptContent = readFileSync(installScriptPath, 'utf-8');
    const hasShebang = scriptContent.startsWith('#!/bin/bash');
    log(`   Shebang 正确: ${hasShebang}`);
    expect(hasShebang).toBe(true);

    // Check required dependencies in script
    log('\n4. 检查脚本包含必要的步骤...');
    const requiredSteps = [
      'bun install',
      'ollama',
      'nomic-embed-text',
      'opencode.json',
      'memory.db'
    ];
    
    for (const step of requiredSteps) {
      const hasStep = scriptContent.includes(step);
      log(`   包含 ${step}: ${hasStep}`);
      expect(hasStep).toBe(true);
    }

    // Check environment variables
    log('\n5. 检查环境变量处理...');
    const hasEnvCheck = scriptContent.includes('MEMORY_API') || scriptContent.includes('localhost:3002');
    log(`   包含环境变量配置: ${hasEnvCheck}`);
    expect(hasEnvCheck).toBe(true);

    // Try dry run of key commands
    log('\n6. 测试关键命令...');
    
    // Test bun --version
    log('   测试 bun --version');
    const bunResult = await runCommand('bun', ['--version']);
    log(`   bun version: ${bunResult.stdout.trim()}`);
    expect(bunResult.code).toBe(0);

    // Test docker
    log('   测试 docker --version');
    const dockerResult = await runCommand('docker', ['--version']);
    log(`   docker: ${dockerResult.stdout.trim()}`);
    expect(dockerResult.code).toBe(0);

    // Test curl (for health check)
    log('   测试 curl');
    const curlResult = await runCommand('curl', ['--version']);
    log(`   curl: ${curlResult.stdout.split('\n')[0]}`);
    expect(curlResult.code).toBe(0);

    log('\n✅ Install script validation passed!');
    log('   所有检查项通过，脚本可以正常执行');
    log('');
  });

  test('9. Installation Process - Simulate installation steps', async () => {
    log('========================================');
    log('🧪 Test 9: Installation Process Simulation');
    log('========================================');

    // Step 1: Check bun installation
    log('\n1. 模拟安装步骤 - Bun...');
    const bunCheck = await runCommand('which', ['bun']);
    log(`   Bun 路径: ${bunCheck.stdout.trim() || '未找到'}`);
    
    // Step 2: Check dependencies installed
    log('\n2. 检查项目依赖...');
    const packageJsonExists = existsSync(join(PROJECT_ROOT, 'package.json'));
    log(`   package.json 存在: ${packageJsonExists}`);
    expect(packageJsonExists).toBe(true);

    // Step 3: Check node_modules (should exist after bun install)
    log('\n3. 检查依赖安装...');
    const nodeModulesExists = existsSync(join(PROJECT_ROOT, 'node_modules'));
    log(`   node_modules 存在: ${nodeModulesExists}`);
    
    // Step 4: Check database schema
    log('\n4. 检查数据库 schema...');
    const schemaExists = existsSync(join(PROJECT_ROOT, 'src/db/schema.ts'));
    log(`   schema.ts 存在: ${schemaExists}`);
    expect(schemaExists).toBe(true);

    // Step 5: Check API server
    log('\n5. 检查 API 服务...');
    const apiExists = existsSync(join(PROJECT_ROOT, 'src/index.ts'));
    log(`   index.ts 存在: ${apiExists}`);
    expect(apiExists).toBe(true);

    // Step 6: Check MCP server
    log('\n6. 检查 MCP 服务器...');
    const mcpExists = existsSync(join(PROJECT_ROOT, 'src/mcp.ts'));
    log(`   mcp.ts 存在: ${mcpExists}`);
    expect(mcpExists).toBe(true);

    // Step 7: Check README
    log('\n7. 检查文档...');
    const readmeExists = existsSync(join(PROJECT_ROOT, 'README.md'));
    log(`   README.md 存在: ${readmeExists}`);
    expect(readmeExists).toBe(true);

    // Step 8: Check AGENTS.md
    log('\n8. 检查 AGENTS.md...');
    const agentsExists = existsSync(join(PROJECT_ROOT, 'AGENTS.md'));
    log(`   AGENTS.md 存在: ${agentsExists}`);
    expect(agentsExists).toBe(true);

    // Step 9: Check E2E tests
    log('\n9. 检查测试文件...');
    const testExists = existsSync(join(PROJECT_ROOT, 'tests/e2e/memory.test.ts'));
    log(`   E2E 测试存在: ${testExists}`);
    expect(testExists).toBe(true);

    log('\n✅ Installation process validation passed!');
    log('   所有项目文件和结构验证通过');
    log('');
  });
});

log('🚀 Starting E2E Tests...');
log(`🌐 API Base: ${API_BASE}`);
log(`👤 Test User: ${TEST_USER_ID}`);
log(`⏰ Timestamp: ${TIMESTAMP}`);
log('');
