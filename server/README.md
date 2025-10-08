# Mock External Authorization Server

This is a simple gRPC-based external authorization server that implements the Envoy External Authorization protocol. It automatically approves all incoming requests without performing any actual authorization checks.

## Purpose

This mock server is designed for testing the Agent Gateway's external authorization feature. It runs on port 9000 and responds to authorization check requests from the gateway.

## Features

- ✅ Auto-approves all requests
- 📝 Logs all authorization requests for debugging
- 🔧 Implements Envoy External Authorization gRPC protocol
- 🚀 Simple and easy to run

## Installation

Install the required dependencies:

```bash
npm install
```

## Running the Server

Start the server with:

```bash
npm start
```

Or directly with Node.js:

```bash
node server.js
```

The server will start on port 9000 and display:

```
╔════════════════════════════════════════════════════╗
║   Mock External Authorization Server Running      ║
╚════════════════════════════════════════════════════╝

🚀 Server listening on 9000
📝 Mode: Auto-approve all requests

Press Ctrl+C to stop the server
```

## How It Works

1. The Agent Gateway sends authorization check requests to this server via gRPC
2. The server logs the request details (method, path, headers, etc.)
3. The server automatically responds with an OK status (code 0), approving the request
4. Additional response headers are added:
   - `x-authz-result: approved`
   - `x-authz-server: mock-server`

## Protocol Details

This server implements the `envoy.service.auth.v3.Authorization` service with a single `Check` RPC method. The protocol is defined in `external_auth.proto`.

### Response Format

Every request receives an approval response:

```javascript
{
  status: {
    code: 0,  // 0 = OK (approved)
    message: 'Auto-approved by mock authorization server'
  },
  ok_response: [
    // Additional headers added to approved requests
  ]
}
```

## Customization

To modify the authorization logic, edit the `check` function in `server.js`. You can:

- Add actual authorization checks
- Deny specific requests by returning a non-zero status code
- Add custom headers to the response
- Implement complex authorization policies

## Troubleshooting

**Server won't start:**
- Make sure port 9000 is not already in use
- Check that Node.js is installed (`node --version`)

**No logs appearing:**
- Verify the Agent Gateway is configured to use `localhost:9000` as the extAuthz host
- Check that the gateway is running and receiving requests

## Stopping the Server

Press `Ctrl+C` to gracefully shutdown the server.
