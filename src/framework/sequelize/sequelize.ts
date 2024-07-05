import { Sequelize } from 'sequelize-typescript';
import type { Dialect } from 'sequelize';
import path from 'node:path';


const database = new Sequelize({
  dialect: process.env.DB_DIALECT as Dialect,
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  logging: console.log,
  models: [path.join(__dirname, '..','..','repository','models')]
});
export default database;
 