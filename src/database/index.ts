import mysql   from 'mysql2/promise';
import { env } from '../shared/env';
import fs      from 'node:fs/promises';
import path    from 'node:path';

export const pool = mysql.createPool({
  host:               env.DB_HOST,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  database:           env.DB_NAME,
  port:               env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
});

export async function initTables() {
  try {

    const sqlFilePath = path.resolve(__dirname, '../../modelagem_do_banco.sql');
    
    const sqlScript = await fs.readFile(sqlFilePath, 'utf-8');
    
    const queries = sqlScript
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0);

    console.log(`[Database] Iniciando execução de ${queries.length} queries estruturais...`);

    const connection = await pool.getConnection();

    try {

      for (const query of queries) {

        await connection.query(query);

      }
      console.log('[Database] Todas as tabelas foram validadas/criadas com sucesso.');

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('[Database Error] Erro ao ler ou executar o script initTable:', error);
    throw error;
  }
}