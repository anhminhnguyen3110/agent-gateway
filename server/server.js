const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the protobuf definition
const PROTO_PATH = path.join(__dirname, 'external_auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).envoy.service.auth.v3;

/**
 * Mock Check implementation - always approves requests
 * This is a simple authorization server that automatically approves all requests
 */
function check(call, callback) {
  const request = call.request;
  
  // Log the incoming request for debugging
  console.log('=== Authorization Check Request ===');
  console.log('Time:', new Date().toISOString());
  
  if (request.attributes && request.attributes.request && request.attributes.request.http) {
    const http = request.attributes.request.http;
    console.log('Method:', http.method);
    console.log('Path:', http.path);
    console.log('Host:', http.host);
    console.log('Headers:', JSON.stringify(http.headers, null, 2));
  }
  
  if (request.attributes && request.attributes.source) {
    console.log('Source Address:', request.attributes.source.address);
  }
  
  // Auto-approve: Return OK status
  // Return a proper Envoy External Authorization response with OkHttpResponse
  const response = {
    status: {
      code: 0  // google.rpc.Code.OK = 0
    },
    ok_response: {
      headers: [
        {
          header: {
            key: 'x-authz-result',
            value: 'approved'
          }
        },
        {
          header: {
            key: 'x-authz-server',
            value: 'mock-server'
          }
        }
      ]
    }
  };
  
  console.log('✓ Request APPROVED (status code 0)');
  console.log('=====================================\n');
  
  callback(null, response);
}

/**
 * Start the gRPC server
 */
function main() {
  const server = new grpc.Server();
  
  server.addService(authProto.Authorization.service, {
    Check: check
  });
  
  const port = '0.0.0.0:9000';
  server.bindAsync(
    port,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error('Failed to bind server:', error);
        return;
      }
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║   Mock External Authorization Server Running      ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log(`\n🚀 Server listening on ${port}`);
      console.log('📝 Mode: Auto-approve all requests\n');
      console.log('Press Ctrl+C to stop the server\n');
    }
  );
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down mock authorization server...');
  process.exit(0);
});

main();
