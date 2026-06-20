import mysql   from 'mysql2/promise';
import { env } from '../shared/env';

export const pool = mysql.createPool({
  host:               env.DB_HOST,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  database:           env.DB_NAME,
  port:               env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});
