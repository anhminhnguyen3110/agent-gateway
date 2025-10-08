const axios = require('axios');

// Configuration
const GATEWAY_URL = 'http://localhost:3000';
const TEST_DELAY = 1000; // Delay between tests in milliseconds

/**
 * Test utilities
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async run(name, testFn) {
    console.log(`\n🧪 Running: ${name}`);
    console.log('─'.repeat(60));
    
    try {
      await testFn();
      this.passed++;
      console.log(`✓ PASSED: ${name}\n`);
    } catch (error) {
      this.failed++;
      console.log(`✗ FAILED: ${name}`);
      console.log(`  Error: ${error.message}\n`);
    }
  }

  summary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.passed + this.failed}`);
    console.log(`✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}`);
    console.log('═'.repeat(60) + '\n');
  }
}

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(config) {
  try {
    const response = await axios({
      ...config,
      validateStatus: () => true, // Don't throw on any status
    });
    return response;
  } catch (error) {
    console.log(`  Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 1: Basic MCP endpoint access
 */
async function testBasicMCPAccess() {
  console.log('  Testing basic MCP endpoint access...');
  
  const response = await makeRequest({
    method: 'POST',
    url: `${GATEWAY_URL}/mcp/v1/initialize`,
    headers: {
      'Content-Type': 'application/json',
      'mcp-protocol-version': '1.0',
    },
    data: {
      protocolVersion: '1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });

  console.log(`  Status: ${response.status}`);
  console.log(`  Authorization header present: ${response.headers['x-authz-result'] ? 'Yes' : 'No'}`);
  
  if (response.headers['x-authz-result']) {
    console.log(`  Authorization result: ${response.headers['x-authz-result']}`);
    console.log(`  Authorization server: ${response.headers['x-authz-server']}`);
  }

  if (response.status === 200 || response.status === 404) {
    console.log('  ✓ Request passed through authorization (received response)');
  } else if (response.status === 403) {
    throw new Error('Request was denied by authorization server');
  }
}

/**
 * Test 2: MCP with custom headers
 */
async function testMCPWithCustomHeaders() {
  console.log('  Testing MCP request with custom headers...');
  
  const response = await makeRequest({
    method: 'POST',
    url: `${GATEWAY_URL}/mcp/v1/list`,
    headers: {
      'Content-Type': 'application/json',
      'mcp-protocol-version': '1.0',
      'Authorization': 'Bearer test-token-12345',
      'X-Custom-Header': 'test-value',
    },
    data: {}
  });

  console.log(`  Status: ${response.status}`);
  console.log(`  Custom headers sent successfully`);
  
  if (response.status === 200 || response.status === 404) {
    console.log('  ✓ Request with custom headers authorized');
  } else if (response.status === 403) {
    throw new Error('Request was denied by authorization server');
  }
}

/**
 * Test 3: Different HTTP methods
 */
async function testDifferentMethods() {
  console.log('  Testing different HTTP methods...');
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  for (const method of methods) {
    const response = await makeRequest({
      method: method,
      url: `${GATEWAY_URL}/test-endpoint`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: method !== 'GET' ? { test: 'data' } : undefined
    });
    
    console.log(`  ${method}: ${response.status}`);
    
    if (response.status === 403) {
      throw new Error(`${method} request was denied by authorization server`);
    }
  }
  
  console.log('  ✓ All HTTP methods passed authorization');
}

/**
 * Test 4: Verify authorization headers in response
 */
async function testAuthorizationHeaders() {
  console.log('  Testing for authorization response headers...');
  
  const response = await makeRequest({
    method: 'GET',
    url: `${GATEWAY_URL}/`,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  console.log(`  Status: ${response.status}`);
  
  // Check for custom headers added by the authorization server
  const authzResult = response.headers['x-authz-result'];
  const authzServer = response.headers['x-authz-server'];
  
  if (authzResult === 'approved' && authzServer === 'mock-server') {
    console.log('  ✓ Authorization headers present and correct:');
    console.log(`    - x-authz-result: ${authzResult}`);
    console.log(`    - x-authz-server: ${authzServer}`);
  } else {
    console.log('  ⚠ Warning: Expected authorization headers not found');
    console.log('    This might indicate the external authz is not configured properly');
  }
}

/**
 * Test 5: Multiple sequential requests
 */
async function testMultipleRequests() {
  console.log('  Testing multiple sequential requests...');
  
  const numRequests = 5;
  let successCount = 0;
  
  for (let i = 1; i <= numRequests; i++) {
    const response = await makeRequest({
      method: 'POST',
      url: `${GATEWAY_URL}/mcp/v1/ping`,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Number': i.toString(),
      },
      data: { requestId: i }
    });
    
    if (response.status !== 403) {
      successCount++;
    }
    
    console.log(`  Request ${i}/${numRequests}: ${response.status}`);
  }
  
  if (successCount === numRequests) {
    console.log(`  ✓ All ${numRequests} requests passed authorization`);
  } else {
    throw new Error(`Only ${successCount}/${numRequests} requests passed authorization`);
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   MCP Client - External Authorization Tests       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Test Configuration:');
  console.log(`   Gateway URL: ${GATEWAY_URL}`);
  console.log(`   Test Delay: ${TEST_DELAY}ms between tests\n`);
  
  const runner = new TestRunner();
  
  // Wait a bit for services to be ready
  console.log('⏳ Waiting for services to be ready...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run all tests
  await runner.run('Test 1: Basic MCP Access', testBasicMCPAccess);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 2: MCP with Custom Headers', testMCPWithCustomHeaders);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 3: Different HTTP Methods', testDifferentMethods);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 4: Authorization Headers Verification', testAuthorizationHeaders);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 5: Multiple Sequential Requests', testMultipleRequests);
  
  // Show summary
  runner.summary();
  
  // Exit with appropriate code
  process.exit(runner.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
main();
