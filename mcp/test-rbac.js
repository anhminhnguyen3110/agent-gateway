const axios = require('axios');

// Configuration
const GATEWAY_URL = 'http://localhost:3000';
const TEST_DELAY = 500; // Delay between tests in milliseconds

// Test users with different permissions
const USERS = {
  admin: 'admin',      // Full access
  john: 'john',        // Developer access
  jane: 'jane',        // Developer + Analyst access
  bob: 'bob',          // Analyst access (read-only)
  alice: 'alice',      // Guest access (very limited)
  unknown: 'hacker'    // Unknown user (should be denied)
};

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
    console.log(`\n🧪 ${name}`);
    console.log('─'.repeat(70));
    
    try {
      await testFn();
      this.passed++;
      console.log(`✓ PASSED\n`);
    } catch (error) {
      this.failed++;
      console.log(`✗ FAILED: ${error.message}\n`);
    }
  }

  summary() {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total Tests: ${this.passed + this.failed}`);
    console.log(`✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}`);
    console.log('═'.repeat(70) + '\n');
  }
}

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(username, method, path, data = null) {
  const config = {
    method: method,
    url: `${GATEWAY_URL}${path}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${username}`
    },
    validateStatus: () => true, // Don't throw on any status
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    config.data = data;
  }
  
  return await axios(config);
}

/**
 * Test Cases
 */

// Test 1: Admin should have full access
async function testAdminFullAccess() {
  console.log('  Testing admin user with full access...');
  
  const tests = [
    { path: '/mcp/v1/initialize', method: 'POST' },
    { path: '/mcp/v1/execute', method: 'POST' },
    { path: '/api/users', method: 'POST' },
    { path: '/admin/config', method: 'POST' }
  ];
  
  for (const test of tests) {
    const response = await makeRequest(USERS.admin, test.method, test.path, {});
    console.log(`    ${test.method} ${test.path}: ${response.status}`);
    
    // Admin should not get 403 (forbidden) - should get 406 or other non-403 status
    if (response.status === 403) {
      throw new Error(`Admin was denied access to ${test.method} ${test.path}`);
    }
  }
  
  console.log('  ✓ Admin has access to all tested resources');
}

// Test 2: Developer (john) should have MCP and analytics access
async function testDeveloperAccess() {
  console.log('  Testing developer user (john)...');
  
  // Should have access to these
  const allowedResources = [
    { path: '/mcp/v1/initialize', method: 'POST' },
    { path: '/mcp/v1/execute', method: 'POST' },
    { path: '/api/analytics', method: 'GET' },
    { path: '/api/analytics', method: 'POST' }
  ];
  
  for (const resource of allowedResources) {
    const response = await makeRequest(USERS.john, resource.method, resource.path, {});
    console.log(`    ✓ ${resource.method} ${resource.path}: ${response.status}`);
    
    if (response.status === 403) {
      throw new Error(`Developer should have access to ${resource.method} ${resource.path}`);
    }
  }
  
  console.log('  ✓ Developer has correct access permissions');
}

// Test 3: Analyst (bob) should have read-only access
async function testAnalystReadOnly() {
  console.log('  Testing analyst user (bob) - read-only...');
  
  // Should have read access
  const allowedResources = [
    { path: '/mcp/v1/list', method: 'POST' },
    { path: '/api/analytics', method: 'GET' }
  ];
  
  for (const resource of allowedResources) {
    const response = await makeRequest(USERS.bob, resource.method, resource.path, {});
    console.log(`    ✓ ${resource.method} ${resource.path}: ${response.status}`);
    
    if (response.status === 403) {
      throw new Error(`Analyst should have access to ${resource.method} ${resource.path}`);
    }
  }
  
  // Should NOT have write access
  const deniedResources = [
    { path: '/mcp/v1/execute', method: 'POST' }
  ];
  
  for (const resource of deniedResources) {
    const response = await makeRequest(USERS.bob, resource.method, resource.path, {});
    console.log(`    ✗ ${resource.method} ${resource.path}: ${response.status} (should be denied)`);
    
    if (response.status !== 403) {
      throw new Error(`Analyst should NOT have access to ${resource.method} ${resource.path}`);
    }
  }
  
  console.log('  ✓ Analyst has correct read-only permissions');
}

// Test 4: Guest (alice) should have very limited access
async function testGuestLimitedAccess() {
  console.log('  Testing guest user (alice) - limited access...');
  
  // Should only have access to list
  const allowedResources = [
    { path: '/mcp/v1/list', method: 'POST' }
  ];
  
  for (const resource of allowedResources) {
    const response = await makeRequest(USERS.alice, resource.method, resource.path, {});
    console.log(`    ✓ ${resource.method} ${resource.path}: ${response.status}`);
    
    if (response.status === 403) {
      throw new Error(`Guest should have access to ${resource.method} ${resource.path}`);
    }
  }
  
  // Should NOT have access to most things
  const deniedResources = [
    { path: '/mcp/v1/initialize', method: 'POST' },
    { path: '/mcp/v1/execute', method: 'POST' }
  ];
  
  for (const resource of deniedResources) {
    const response = await makeRequest(USERS.alice, resource.method, resource.path, {});
    console.log(`    ✗ ${resource.method} ${resource.path}: ${response.status} (should be denied)`);
    
    if (response.status !== 403) {
      throw new Error(`Guest should NOT have access to ${resource.method} ${resource.path}`);
    }
  }
  
  console.log('  ✓ Guest has correct limited permissions');
}

// Test 5: Jane (multiple groups) should have combined permissions
async function testMultipleGroups() {
  console.log('  Testing user with multiple groups (jane)...');
  
  // Jane is in both developers and analysts groups
  // Should have access to developer resources
  const devResources = [
    { path: '/mcp/v1/initialize', method: 'POST' },
    { path: '/mcp/v1/execute', method: 'POST' }
  ];
  
  // And analyst resources
  const analystResources = [
    { path: '/api/analytics', method: 'GET' }
  ];
  
  for (const resource of [...devResources, ...analystResources]) {
    const response = await makeRequest(USERS.jane, resource.method, resource.path, {});
    console.log(`    ✓ ${resource.method} ${resource.path}: ${response.status}`);
    
    if (response.status === 403) {
      throw new Error(`User with multiple groups should have access to ${resource.method} ${resource.path}`);
    }
  }
  
  console.log('  ✓ Multi-group user has combined permissions');
}

// Test 6: Unknown user should be denied
async function testUnknownUserDenied() {
  console.log('  Testing unknown user...');
  
  const response = await makeRequest(USERS.unknown, 'POST', '/mcp/v1/list', {});
  console.log(`    Status: ${response.status}`);
  
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`Unknown user should be denied (got ${response.status})`);
  }
  
  console.log('  ✓ Unknown user correctly denied');
}

// Test 7: No authorization header should be denied
async function testNoAuthDenied() {
  console.log('  Testing request without authorization header...');
  
  const response = await axios({
    method: 'POST',
    url: `${GATEWAY_URL}/mcp/v1/list`,
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: () => true,
    data: {}
  });
  
  console.log(`    Status: ${response.status}`);
  
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`Request without auth should be denied (got ${response.status})`);
  }
  
  console.log('  ✓ Request without authorization correctly denied');
}

/**
 * Main test execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   RBAC Authorization Testing - Multiple Users & Permissions       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Test Configuration:');
  console.log(`   Gateway URL: ${GATEWAY_URL}`);
  console.log(`   Test Delay: ${TEST_DELAY}ms between tests\n`);
  
  console.log('👥 Test Users:');
  console.log('   admin  → administrators (full access)');
  console.log('   john   → developers (MCP + analytics)');
  console.log('   jane   → developers + analysts (combined access)');
  console.log('   bob    → analysts (read-only)');
  console.log('   alice  → guests (limited access)');
  console.log('   hacker → unknown user (no access)\n');
  
  const runner = new TestRunner();
  
  // Wait a bit for services to be ready
  console.log('⏳ Waiting for services to be ready...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run all tests
  await runner.run('Test 1: Admin Full Access', testAdminFullAccess);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 2: Developer Access (john)', testDeveloperAccess);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 3: Analyst Read-Only (bob)', testAnalystReadOnly);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 4: Guest Limited Access (alice)', testGuestLimitedAccess);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 5: Multiple Groups (jane)', testMultipleGroups);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 6: Unknown User Denied', testUnknownUserDenied);
  await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  
  await runner.run('Test 7: No Authorization Header', testNoAuthDenied);
  
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
