const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Namasterides@1@db.plbeqmlfhoflsmwtlszd.supabase.co:5432/postgres'
});
client.connect()
  .then(() => client.query("SELECT * FROM rest_tables LIMIT 1"))
  .then(res => {
    console.log("Rest_tables:", res.rows);
    return client.query("SELECT * FROM orders LIMIT 1");
  })
  .then(res => {
    console.log("Orders:", res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
