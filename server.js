const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_data (
        id      TEXT PRIMARY KEY DEFAULT 'kavaju_main',
        data    JSONB NOT NULL DEFAULT '{}',
        updated TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      INSERT INTO erp_data (id, data)
      VALUES ('kavaju_main', '{}')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Base de datos lista');
  } catch (err) {
    console.error('❌ Error iniciando DB:', err.message);
  }
}

app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT data FROM erp_data WHERE id = $1',
      ['kavaju_main']
    );
    res.json(result.rows.length ? result.rows[0].data : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/data', async (req, res) => {
  try {
    await pool.query(
      `UPDATE erp_data SET data = $1, updated = NOW() WHERE id = 'kavaju_main'`,
      [JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'sin conexión' });
  }
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🐴 Kavaju ERP corriendo en puerto ${PORT}`);
  });
});
