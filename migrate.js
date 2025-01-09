require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Verify .env is loaded
console.log('Environment variables:', {
  PG_USER: process.env.PG_USER,
  PG_HOST: process.env.PG_HOST,
  PG_DATABASE: process.env.PG_DATABASE,
  PG_PORT: process.env.PG_PORT
});

// Enhanced connection configuration with error handling
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: String(process.env.PG_PASSWORD || ''), // Ensure password is treated as string
  port: Number(process.env.PG_PORT),
  connectionTimeoutMillis: 5000,
  ssl: false
});

console.log('Using database configuration:', {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT
});

// Verify connection before proceeding
async function verifyConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('Database connection verified');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  // Verify database connection first
  if (!await verifyConnection()) {
    console.error('Cannot proceed with migrations - database connection failed');
    process.exit(1);
  }

  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Migrations table verified/created');

    // Get already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY id ASC'
    );

    // Get all migration files
    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute new migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.some(m => m.name === file)) {
        console.log(`Running migration: ${file}`);
        
        const sql = fs.readFileSync(
          path.join(__dirname, 'migrations', file),
          'utf8'
        );

        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        
        console.log(`Migration ${file} completed successfully`);
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});