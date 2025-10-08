const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'authz.db');

// Delete existing database to start fresh
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️  Deleted existing database');
}

// Create new database
const db = new Database(DB_PATH);
console.log('📦 Created new database');

// Read and execute schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
console.log('✅ Created database schema');

// Insert sample data
console.log('\n📝 Inserting sample data...\n');

// 1. Create Users
console.log('Creating users...');
const insertUser = db.prepare('INSERT INTO users (username, email) VALUES (?, ?)');
const users = [
  { username: 'admin', email: 'admin@example.com' },
  { username: 'john', email: 'john@example.com' },
  { username: 'jane', email: 'jane@example.com' },
  { username: 'bob', email: 'bob@example.com' },
  { username: 'alice', email: 'alice@example.com' }
];

users.forEach(user => {
  insertUser.run(user.username, user.email);
  console.log(`  ✓ Created user: ${user.username}`);
});

// 2. Create Groups
console.log('\nCreating groups...');
const insertGroup = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)');
const groups = [
  { name: 'administrators', description: 'Full system access' },
  { name: 'developers', description: 'Development and testing access' },
  { name: 'analysts', description: 'Read-only access to analytics' },
  { name: 'guests', description: 'Limited read access' }
];

groups.forEach(group => {
  insertGroup.run(group.name, group.description);
  console.log(`  ✓ Created group: ${group.name}`);
});

// 3. Create Resources
console.log('\nCreating resources...');
const insertResource = db.prepare('INSERT INTO resources (path, method, description) VALUES (?, ?, ?)');
const resources = [
  { path: '/mcp/v1/initialize', method: 'POST', description: 'Initialize MCP session' },
  { path: '/mcp/v1/list', method: 'POST', description: 'List MCP resources' },
  { path: '/mcp/v1/tools', method: 'POST', description: 'Access MCP tools' },
  { path: '/mcp/v1/execute', method: 'POST', description: 'Execute MCP commands' },
  { path: '/api/analytics', method: 'GET', description: 'View analytics data' },
  { path: '/api/analytics', method: 'POST', description: 'Create analytics data' },
  { path: '/api/users', method: 'GET', description: 'List users' },
  { path: '/api/users', method: 'POST', description: 'Create users' },
  { path: '/api/users', method: 'PUT', description: 'Update users' },
  { path: '/api/users', method: 'DELETE', description: 'Delete users' },
  { path: '/admin/config', method: 'GET', description: 'View configuration' },
  { path: '/admin/config', method: 'POST', description: 'Update configuration' }
];

resources.forEach(resource => {
  insertResource.run(resource.path, resource.method, resource.description);
  console.log(`  ✓ Created resource: ${resource.method} ${resource.path}`);
});

// 4. Assign Users to Groups
console.log('\nAssigning users to groups...');
const insertUserGroup = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');

// Get IDs for easier reference
const getUserId = db.prepare('SELECT id FROM users WHERE username = ?');
const getGroupId = db.prepare('SELECT id FROM groups WHERE name = ?');

const userGroupMappings = [
  { username: 'admin', groups: ['administrators'] },
  { username: 'john', groups: ['developers'] },
  { username: 'jane', groups: ['developers', 'analysts'] },
  { username: 'bob', groups: ['analysts'] },
  { username: 'alice', groups: ['guests'] }
];

userGroupMappings.forEach(mapping => {
  const userId = getUserId.get(mapping.username).id;
  mapping.groups.forEach(groupName => {
    const groupId = getGroupId.get(groupName).id;
    insertUserGroup.run(userId, groupId);
    console.log(`  ✓ Added ${mapping.username} to ${groupName}`);
  });
});

// 5. Assign Resources to Groups
console.log('\nAssigning resources to groups...');
const insertGroupResource = db.prepare('INSERT INTO group_resources (group_id, resource_id) VALUES (?, ?)');
const getResourceId = db.prepare('SELECT id FROM resources WHERE path = ? AND method = ?');

const groupResourceMappings = [
  {
    group: 'administrators',
    resources: [
      // Admins have access to everything
      { path: '/mcp/v1/initialize', method: 'POST' },
      { path: '/mcp/v1/list', method: 'POST' },
      { path: '/mcp/v1/tools', method: 'POST' },
      { path: '/mcp/v1/execute', method: 'POST' },
      { path: '/api/analytics', method: 'GET' },
      { path: '/api/analytics', method: 'POST' },
      { path: '/api/users', method: 'GET' },
      { path: '/api/users', method: 'POST' },
      { path: '/api/users', method: 'PUT' },
      { path: '/api/users', method: 'DELETE' },
      { path: '/admin/config', method: 'GET' },
      { path: '/admin/config', method: 'POST' }
    ]
  },
  {
    group: 'developers',
    resources: [
      // Developers have MCP access and read/write analytics
      { path: '/mcp/v1/initialize', method: 'POST' },
      { path: '/mcp/v1/list', method: 'POST' },
      { path: '/mcp/v1/tools', method: 'POST' },
      { path: '/mcp/v1/execute', method: 'POST' },
      { path: '/api/analytics', method: 'GET' },
      { path: '/api/analytics', method: 'POST' },
      { path: '/api/users', method: 'GET' }
    ]
  },
  {
    group: 'analysts',
    resources: [
      // Analysts have read-only access to analytics and MCP list
      { path: '/mcp/v1/list', method: 'POST' },
      { path: '/api/analytics', method: 'GET' },
      { path: '/api/users', method: 'GET' }
    ]
  },
  {
    group: 'guests',
    resources: [
      // Guests can only list MCP resources
      { path: '/mcp/v1/list', method: 'POST' }
    ]
  }
];

groupResourceMappings.forEach(mapping => {
  const groupId = getGroupId.get(mapping.group).id;
  mapping.resources.forEach(resource => {
    const resourceId = getResourceId.get(resource.path, resource.method).id;
    insertGroupResource.run(groupId, resourceId);
    console.log(`  ✓ Granted ${mapping.group} access to ${resource.method} ${resource.path}`);
  });
});

console.log('\n✅ Database initialization complete!\n');

// Display summary
console.log('📊 Summary:');
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get();
const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
const userGroupCount = db.prepare('SELECT COUNT(*) as count FROM user_groups').get();
const groupResourceCount = db.prepare('SELECT COUNT(*) as count FROM group_resources').get();

console.log(`   Users: ${userCount.count}`);
console.log(`   Groups: ${groupCount.count}`);
console.log(`   Resources: ${resourceCount.count}`);
console.log(`   User-Group Relationships: ${userGroupCount.count}`);
console.log(`   Group-Resource Permissions: ${groupResourceCount.count}`);

console.log('\n👥 User Access Summary:');
console.log('   admin  → administrators → Full access');
console.log('   john   → developers → MCP + Analytics read/write');
console.log('   jane   → developers, analysts → MCP + Analytics');
console.log('   bob    → analysts → Analytics read-only');
console.log('   alice  → guests → MCP list only\n');

db.close();
