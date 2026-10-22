const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool = null;
let sqliteDb = null;
const isSqlite = process.env.DB_CLIENT === 'sqlite' || (!process.env.DATABASE_URL && !process.env.PGDATABASE);

if (isSqlite) {
  // Uso de SQLite nativo integrado en Node.js 22+
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'cafeteria.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`[DB] Conectado exitosamente a base de datos SQLite local: ${dbPath}`);
} else {
  // Conexión PostgreSQL mediante Pool de 'pg'
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE || 'cafeteria_db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  });

  pool.on('connect', () => {
    console.log('[DB] Conexión establecida con PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('[DB] Error inesperado en el cliente de PostgreSQL:', err.message);
  });
}

/**
 * Normaliza las consultas parametrizadas ($1, $2) para SQLite (?)
 * y convierte funciones específicas si fuese necesario.
 */
function normalizeQueryForSqlite(sql) {
  let normalized = sql;

  // Convertir placeholders $1, $2 -> ?
  normalized = normalized.replace(/\$\d+/g, '?');

  // Normalizar diferencias de sintaxis comunes
  normalized = normalized.replace(/CURRENT_TIMESTAMP - INTERVAL '(\d+) MINUTE'/gi, "datetime('now', '-$1 minutes')");
  normalized = normalized.replace(/CURRENT_TIMESTAMP - INTERVAL '(\d+) HOUR'/gi, "datetime('now', '-$1 hours')");
  normalized = normalized.replace(/CURRENT_TIMESTAMP - INTERVAL '(\d+) DAY'/gi, "datetime('now', '-$1 days')");
  normalized = normalized.replace(/SERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT");
  normalized = normalized.replace(/BOOLEAN/gi, "INTEGER");

  return normalized;
}

/**
 * Ejecuta una consulta SQL parametrizada
 * @param {string} text - Consulta SQL (formato $1, $2, ...)
 * @param {Array} params - Parámetros
 */
async function query(text, params = []) {
  if (isSqlite) {
    const normalizedSql = normalizeQueryForSqlite(text);
    const trimmed = normalizedSql.trim().toUpperCase();

    // Normalizar booleanos en SQLite (true -> 1, false -> 0)
    const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

    try {
      if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING') || trimmed.startsWith('WITH')) {
        const stmt = sqliteDb.prepare(normalizedSql);
        const rows = stmt.all(...sanitizedParams);
        return {
          rows,
          rowCount: rows.length
        };
      } else {
        const stmt = sqliteDb.prepare(normalizedSql);
        const result = stmt.run(...sanitizedParams);
        return {
          rows: [],
          rowCount: Number(result.changes),
          lastInsertRowid: result.lastInsertRowid
        };
      }
    } catch (err) {
      console.error('[DB SQLite Error]:', err.message, 'SQL:', normalizedSql);
      throw err;
    }
  } else {
    return pool.query(text, params);
  }
}

/**
 * Obtiene un cliente dedicado para manejo de transacciones (BEGIN / COMMIT / ROLLBACK)
 */
async function getClient() {
  if (isSqlite) {
    let inTransaction = false;
    return {
      query: async (text, params = []) => {
        const trimmed = text.trim().toUpperCase();
        if (trimmed === 'BEGIN') {
          sqliteDb.exec('BEGIN');
          inTransaction = true;
          return { rows: [], rowCount: 0 };
        }
        if (trimmed === 'COMMIT') {
          sqliteDb.exec('COMMIT');
          inTransaction = false;
          return { rows: [], rowCount: 0 };
        }
        if (trimmed === 'ROLLBACK') {
          if (inTransaction) {
            sqliteDb.exec('ROLLBACK');
            inTransaction = false;
          }
          return { rows: [], rowCount: 0 };
        }
        return query(text, params);
      },
      release: () => {
        // En SQLite embebido no se necesita liberar conexión de pool
      }
    };
  } else {
    return pool.connect();
  }
}

module.exports = {
  query,
  getClient,
  isSqlite: () => isSqlite,
  getPool: () => pool,
  getSqliteDb: () => sqliteDb
};
