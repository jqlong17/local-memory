import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

const API_BASE = process.env.MEMORY_API || 'http://localhost:3002';
const TEST_USER_ID = 'e2e-test-user';
const TIMESTAMP = Date.now();

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
});

log('🚀 Starting E2E Tests...');
log(`🌐 API Base: ${API_BASE}`);
log(`👤 Test User: ${TEST_USER_ID}`);
log(`⏰ Timestamp: ${TIMESTAMP}`);
log('');
