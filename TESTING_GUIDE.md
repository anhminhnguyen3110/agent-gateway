# Agent Gateway - External Authorization Testing

This repository contains a complete setup for testing the Agent Gateway's external authorization feature.

## 📁 Project Structure

```
agentgateway/
├── agentgateway.exe         # Agent Gateway executable
├── config.yml               # Gateway configuration with external authz
├── server/                  # Mock authorization server
│   ├── package.json
│   ├── server.js            # gRPC authorization server
│   ├── external_auth.proto  # Envoy External Auth protocol definition
│   └── README.md            # Server documentation
└── mcp/                     # MCP test client
    ├── package.json
    ├── client.js            # Test suite
    └── README.md            # Client documentation
```

## 🎯 What's Included

### 1. Updated Configuration (`config.yml`)
The gateway configuration has been updated to include external authorization:

```yaml
extAuthz:
  host: localhost:9000
```

This tells the Agent Gateway to send all requests to the external authorization server running on port 9000 for approval before processing them.

### 2. Mock Authorization Server (`server/`)
A simple gRPC server that implements the Envoy External Authorization protocol. It automatically approves all requests and logs the details for debugging.

**Key features:**
- ✅ Auto-approves all authorization requests
- 📝 Logs all request details (method, path, headers, etc.)
- 🔧 Implements the full Envoy External Authorization gRPC protocol
- 🚀 Runs on port 9000

### 3. MCP Test Client (`mcp/`)
A comprehensive test suite that validates the external authorization integration.

**Tests included:**
1. Basic MCP endpoint access
2. Requests with custom headers
3. Different HTTP methods (GET, POST, PUT, DELETE)
4. Authorization header verification
5. Multiple sequential requests

## 🚀 Quick Start Guide

Follow these steps to test the external authorization feature:

### Step 1: Install Dependencies

#### For the Mock Authorization Server:
```bash
cd server
npm install
```

#### For the MCP Test Client:
```bash
cd mcp
npm install
```

### Step 2: Start the Mock Authorization Server

Open a terminal and run:

```bash
cd server
npm start
```

You should see:
```
╔════════════════════════════════════════════════════╗
║   Mock External Authorization Server Running      ║
╚════════════════════════════════════════════════════╝

🚀 Server listening on 9000
📝 Mode: Auto-approve all requests
```

**Keep this terminal open** - the server needs to keep running.

### Step 3: Start the Agent Gateway

Open a **new terminal** and run:

```bash
./agentgateway.exe
```

The gateway will start on port 3000 and will use the external authorization server on port 9000.

**Keep this terminal open** - the gateway needs to keep running.

### Step 4: Run the Test Client

Open a **third terminal** and run:

```bash
cd mcp
npm test
```

The test suite will execute and you should see output like:

```
╔════════════════════════════════════════════════════╗
║   MCP Client - External Authorization Tests       ║
╚════════════════════════════════════════════════════╝

📋 Test Configuration:
   Gateway URL: http://localhost:3000
   Test Delay: 1000ms between tests

🧪 Running: Test 1: Basic MCP Access
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

### Step 5: Observe Authorization Logs

While the tests are running, switch back to the **authorization server terminal** (Step 2). You should see detailed logs of each authorization request:

```
=== Authorization Check Request ===
Time: 2025-10-09T12:34:56.789Z
Method: POST
Path: /mcp/v1/initialize
Host: localhost:3000
Headers: {
  "content-type": "application/json",
  "mcp-protocol-version": "1.0"
}
✓ Request APPROVED
=====================================
```

## 🔍 How It Works

The external authorization flow works as follows:

1. **Client Request**: The MCP test client sends a request to the Agent Gateway (port 3000)

2. **Authorization Check**: Before processing the request, the gateway sends an authorization check to the external authorization server (port 9000) via gRPC

3. **Authorization Decision**: The mock server examines the request (method, path, headers, etc.) and returns an approval

4. **Response Headers**: The authorization server adds custom headers:
   - `x-authz-result: approved`
   - `x-authz-server: mock-server`

5. **Request Processing**: The gateway processes the request and forwards it to the appropriate backend

6. **Client Response**: The client receives the response with the additional authorization headers

## 📊 Verification Checklist

After running the tests, verify the following:

- [ ] Mock authorization server started successfully on port 9000
- [ ] Agent Gateway started successfully on port 3000
- [ ] All 5 test cases passed
- [ ] Authorization server logs show all incoming requests
- [ ] Response headers include `x-authz-result: approved`
- [ ] Response headers include `x-authz-server: mock-server`

## 🛠️ Customization

### Implementing Real Authorization Logic

To add actual authorization checks, edit `server/server.js`:

```javascript
function check(call, callback) {
  const request = call.request;
  const http = request.attributes.request.http;
  
  // Example: Check for specific header
  const authHeader = http.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Deny the request
    callback(null, {
      status: {
        code: 16,  // UNAUTHENTICATED
        message: 'Missing or invalid authorization header'
      },
      denied_response: [
        {
          header: { key: 'x-authz-result', value: 'denied' },
          append: false
        }
      ]
    });
    return;
  }
  
  // Approve the request
  callback(null, {
    status: { code: 0, message: 'OK' },
    ok_response: [...]
  });
}
```

### Adding More Test Cases

Edit `mcp/client.js` to add custom test scenarios:

```javascript
async function testCustomScenario() {
  console.log('  Testing custom scenario...');
  
  const response = await makeRequest({
    method: 'POST',
    url: `${GATEWAY_URL}/your-endpoint`,
    headers: {
      'Your-Custom-Header': 'value',
    },
    data: { /* your data */ }
  });
  
  // Add your assertions
}

// In main():
await runner.run('Test 6: Custom Scenario', testCustomScenario);
```

## 🐛 Troubleshooting

### Port Already in Use

If port 9000 or 3000 is already in use:

1. **For the authorization server**: Edit `server/server.js` and change the port
2. **Update config.yml**: Change `extAuthz.host` to match the new port
3. **For the gateway**: Edit `config.yml` to use a different port

### Tests Failing with Connection Errors

1. Verify all three services are running:
   - Authorization server (port 9000)
   - Agent Gateway (port 3000)
   - Test client

2. Check firewall settings - ensure localhost connections are allowed

3. Wait a few seconds after starting services before running tests

### No Authorization Headers in Response

1. Verify `config.yml` has the `extAuthz` section
2. Check the gateway logs for any errors
3. Ensure the authorization server is responding (check its logs)

## 📚 Additional Resources

- [Agent Gateway Documentation](https://agentgateway.dev/docs/)
- [External Authorization Docs](https://agentgateway.dev/docs/configuration/security/external-authz/)
- [Envoy External Authorization](https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto)
- [Open Policy Agent](https://www.openpolicyagent.org/docs/envoy)

## 📝 Notes

- The mock authorization server is for **testing purposes only**
- In production, use a real authorization service like Open Policy Agent (OPA)
- The gRPC protocol is based on Envoy's External Authorization API v3
- All requests are logged by the authorization server for debugging

## 🎓 Next Steps

1. ✅ Verify the basic setup works with the mock server
2. 🔧 Customize the authorization logic for your use case
3. 🧪 Add more test scenarios specific to your requirements
4. 🚀 Deploy with a production-ready authorization service
5. 📊 Add monitoring and observability for authorization decisions
