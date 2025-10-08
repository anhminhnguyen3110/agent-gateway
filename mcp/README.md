# MCP Test Client

This is a test client for validating the Agent Gateway's external authorization integration. It sends various HTTP requests to the gateway and verifies that they are properly authorized by the external authorization server.

## Purpose

This test client validates that:
- ✅ The Agent Gateway correctly integrates with the external authorization server
- ✅ Requests are forwarded to the authorization server for approval
- ✅ Authorization headers are properly added to responses
- ✅ Multiple request types are handled correctly

## Installation

Install the required dependencies:

```bash
npm install
```

## Prerequisites

Before running the tests, ensure the following services are running:

1. **Mock Authorization Server** (port 9000)
   ```bash
   cd ../server
   npm install
   npm start
   ```

2. **Agent Gateway** (port 3000)
   ```bash
   # Run the agent gateway with the updated config.yml
   ./agentgateway.exe
   ```

## Running the Tests

Start the test client with:

```bash
npm test
```

Or directly with Node.js:

```bash
node client.js
```

## Test Suite

The client runs the following tests:

### Test 1: Basic MCP Access
- Sends a basic MCP initialization request
- Verifies the request passes through authorization
- Checks for authorization response headers

### Test 2: MCP with Custom Headers
- Sends MCP request with custom headers (including Authorization header)
- Verifies custom headers are properly forwarded
- Confirms authorization approval

### Test 3: Different HTTP Methods
- Tests GET, POST, PUT, and DELETE methods
- Ensures all HTTP methods are properly authorized
- Validates consistent authorization behavior

### Test 4: Authorization Headers Verification
- Checks that the authorization server adds expected headers:
  - `x-authz-result: approved`
  - `x-authz-server: mock-server`
- Confirms the external authorization integration is working

### Test 5: Multiple Sequential Requests
- Sends 5 sequential requests
- Verifies consistent authorization behavior
- Tests stability under multiple requests

## Expected Output

A successful test run will display:

```
╔════════════════════════════════════════════════════╗
║   MCP Client - External Authorization Tests       ║
╚════════════════════════════════════════════════════╝

📋 Test Configuration:
   Gateway URL: http://localhost:3000
   Test Delay: 1000ms between tests

⏳ Waiting for services to be ready...

🧪 Running: Test 1: Basic MCP Access
────────────────────────────────────────────────────────
  Testing basic MCP endpoint access...
  Status: 200
  Authorization header present: Yes
  Authorization result: approved
  Authorization server: mock-server
  ✓ Request passed through authorization (received response)
✓ PASSED: Test 1: Basic MCP Access

... (more tests)

═══════════════════════════════════════════════════════
📊 TEST SUMMARY
═══════════════════════════════════════════════════════
Total Tests: 5
✓ Passed: 5
✗ Failed: 0
═══════════════════════════════════════════════════════
```

## Configuration

You can modify the test configuration at the top of `client.js`:

```javascript
const GATEWAY_URL = 'http://localhost:3000';  // Agent Gateway URL
const TEST_DELAY = 1000;  // Delay between tests in milliseconds
```

## Troubleshooting

**Connection refused errors:**
- Verify the Agent Gateway is running on port 3000
- Check that the mock authorization server is running on port 9000

**Tests fail with 403 status:**
- The authorization server might be denying requests
- Check the authorization server logs for details
- Verify the `config.yml` has the correct `extAuthz.host` setting

**No authorization headers in response:**
- The external authorization might not be properly configured
- Verify `config.yml` contains the `extAuthz` section
- Check the gateway logs for authorization-related messages

**Tests timeout:**
- Increase the `TEST_DELAY` value in `client.js`
- Check network connectivity between services

## Understanding the Results

- **Status 200/404**: Request was authorized and processed (404 is normal if endpoint doesn't exist)
- **Status 403**: Request was denied by the authorization server
- **Authorization headers present**: Confirms the external authz integration is working
- **All tests passed**: External authorization is properly configured and functioning

## Next Steps

After verifying the tests pass, you can:
1. Modify the mock authorization server to implement actual authorization logic
2. Add more complex test scenarios
3. Test with different authorization policies
4. Integrate with a real authorization service (e.g., Open Policy Agent)
