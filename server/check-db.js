const Database = require('better-sqlite3');
const db = new Database('authz.db');

console.log('\n=== RESOURCES ===');
const resources = db.prepare('SELECT * FROM resources ORDER BY method, path').all();
resources.forEach(r => {
  console.log(`${r.id}. ${r.method} ${r.path}`);
});

console.log('\n=== USERS ===');
const users = db.prepare('SELECT * FROM users').all();
users.forEach(u => {
  console.log(`${u.id}. ${u.username}`);
});

console.log('\n=== GROUPS ===');
const groups = db.prepare('SELECT * FROM groups').all();
groups.forEach(g => {
  console.log(`${g.id}. ${g.name}`);
});

console.log('\n=== ADMIN PERMISSIONS ===');
const adminPerms = db.prepare(`
  SELECT DISTINCT r.method, r.path
  FROM users u
  JOIN user_groups ug ON u.id = ug.user_id
  JOIN groups g ON ug.group_id = g.id
  JOIN group_resources gr ON g.id = gr.group_id
  JOIN resources r ON gr.resource_id = r.id
  WHERE u.username = 'admin'
  ORDER BY r.method, r.path
`).all();
adminPerms.forEach(p => {
  console.log(`  ${p.method} ${p.path}`);
});

db.close();
