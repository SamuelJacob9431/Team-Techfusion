const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(dir);

let count = 0;
for (const file of files) {
  if (!file.endsWith('.js')) continue;
  
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace pool.query with await pool.query, making sure not to double add await
  content = content.replace(/(?<!await\s+)pool\.query\(/g, 'await pool.query(');
  
  // Update error code checking
  content = content.replace(/'SQLITE_CONSTRAINT_UNIQUE'/g, "'23505'");
  
  fs.writeFileSync(p, content);
  count++;
}

console.log(`Updated ${count} controllers.`);
