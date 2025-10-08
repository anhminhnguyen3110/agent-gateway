const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Database = require('better-sqlite3');

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

// Initialize SQLite database
const DB_PATH = path.join(__dirname, 'authz.db');
const db = new Database(DB_PATH);

// Prepare SQL statements for better performance
const checkAccessQuery = db.prepare(`
  SELECT COUNT(*) as has_access
  FROM users u
  JOIN user_groups ug ON u.id = ug.user_id
  JOIN groups g ON ug.group_id = g.id
  JOIN group_resources gr ON g.id = gr.group_id
  JOIN resources r ON gr.resource_id = r.id
  WHERE u.username = ? AND r.path = ? AND r.method = ?
`);

const getUserQuery = db.prepare('SELECT id, username, email FROM users WHERE username = ?');

/**
 * RBAC Check implementation - checks user permissions against SQLite database
 * Expects username in the Authorization header as "Bearer <username>"
 */
function check(call, callback) {
  const request = call.request;
  
  // Log the incoming request for debugging
  console.log('=== Authorization Check Request ===');
  console.log('Time:', new Date().toISOString());
  
  let username = null;
  let method = null;
  let path = null;
  
  // Try to extract from context_extensions first (Agent Gateway format)
  if (request.attributes && request.attributes.context_extensions && request.attributes.context_extensions.extensions) {
    const extensions = request.attributes.context_extensions.extensions;
    // The data is in a single key with binary/encoded format
    const extensionKey = Object.keys(extensions)[0];
    if (extensionKey) {
      const data = extensionKey;
      console.log('Parsing extension data...');
      
      // Extract method
      const methodMatch = data.match(/(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/);
      if (methodMatch) method = methodMatch[1];
      
      // Extract path - the path comes after a quote followed by a length byte
      // Pattern: "..."\x0c/mcp/v1/list*\tlocalhost..."
      // The path starts with / and ends before * or space
      const pathMatch = data.match(/"[\x00-\x1f]([\/][^\*\x00-\x08\x0e-\x1f]+)/);
      if (pathMatch) {
        path = pathMatch[1];
      }
      
      // Extract authorization header
      const authMatch = data.match(/authorization[^\w]*Bearer\s+(\w+)/);
      if (authMatch) username = authMatch[1];
      
      console.log('Method:', method);
      console.log('Path:', path);
      console.log('Username:', username || '(not provided)');
    }
  }
  
  // Fallback to standard format if not found above
  if (!method || !path) {
    if (request.attributes && request.attributes.request && request.attributes.request.http) {
      const http = request.attributes.request.http;
      method = method || http.method;
      path = path || http.path;
      
      console.log('Method:', method);
      console.log('Path:', path);
      console.log('Host:', http.host);
      console.log('Headers:', JSON.stringify(http.headers, null, 2));
      
      // Extract username from Authorization header
      // Expected format: "Bearer <username>"
      // Headers might be lowercase
      const headers = http.headers || {};
      const authHeader = headers.authorization || headers.Authorization;
      
      if (authHeader && !username) {
        if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
          username = authHeader.substring(7);
        }
      }
      
      console.log('Username:', username || '(not provided)');
    }
  }
  
  if (request.attributes && request.attributes.source) {
    console.log('Source Address:', request.attributes.source.address);
  }
  
  // If no username provided, deny access
  if (!username) {
    console.log('✗ Request DENIED - No username provided');
    console.log('=====================================\n');
    
    const response = {
      status: {
        code: 16,  // UNAUTHENTICATED
        message: 'No username provided in Authorization header'
      }
    };
    
    callback(null, response);
    return;
  }
  
  // Check if user exists
  const user = getUserQuery.get(username);
  if (!user) {
    console.log(`✗ Request DENIED - User "${username}" not found`);
    console.log('=====================================\n');
    
    const response = {
      status: {
        code: 16,  // UNAUTHENTICATED
        message: `User "${username}" not found`
      }
    };
    
    callback(null, response);
    return;
  }
  
  // Check if user has access to the requested resource
  const accessCheck = checkAccessQuery.get(username, path, method);
  const hasAccess = accessCheck.has_access > 0;
  
  if (hasAccess) {
    // User has access - approve the request
    const response = {
      status: {
        code: 0  // OK
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
              key: 'x-authz-user',
              value: username
            }
          },
          {
            header: {
              key: 'x-authz-server',
              value: 'rbac-server'
            }
          }
        ]
      }
    };
    
    console.log(`✓ Request APPROVED for user "${username}"`);
    console.log('=====================================\n');
    
    callback(null, response);
  } else {
    // User does not have access - deny the request
    console.log(`✗ Request DENIED - User "${username}" does not have access to ${method} ${path}`);
    console.log('=====================================\n');
    
    const response = {
      status: {
        code: 7,  // PERMISSION_DENIED
        message: `User "${username}" does not have permission to access ${method} ${path}`
      }
    };
    
    callback(null, response);
  }
}

/**
 * Start the gRPC server
 */
function main() {
  // Check if database exists
  const fs = require('fs');
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found!');
    console.error('   Please run: npm run init-db');
    process.exit(1);
  }
  
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
      console.log('║   RBAC External Authorization Server Running      ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log(`\n🚀 Server listening on ${port}`);
      console.log('� Mode: Role-Based Access Control (RBAC)\n');
      console.log('📊 Database: authz.db');
      
      // Display user summary
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get();
      const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
      
      console.log(`   ${userCount.count} users, ${groupCount.count} groups, ${resourceCount.count} resources\n`);
      console.log('Press Ctrl+C to stop the server\n');
    }
  );
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down RBAC authorization server...');
  db.close();
  process.exit(0);
});

main();
