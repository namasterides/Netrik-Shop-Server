const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Namasterides@1@db.plbeqmlfhoflsmwtlszd.supabase.co:5432/postgres'
});
client.connect()
  .then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
  .then(res => {
    console.log("Tables:", res.rows.map(r => r.table_name));
    return client.query("SELECT * FROM servers LIMIT 1").catch(() => null);
  })
  .then(res => {
    if (res) console.log("Servers table:", res.rows);
    return client.query("SELECT * FROM users LIMIT 1").catch(() => null);
  })
  .then(res => {
    if (res) console.log("Users table:", res.rows);
    return client.query("SELECT * FROM auth.users LIMIT 1").catch(() => null);
  })
  .then(res => {
    if (res) console.log("Auth users:", res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
