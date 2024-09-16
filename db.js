const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables from .env file

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections in the pool
  queueLimit: 0, // No limit on the queue
});

// Export the promise-based pool (better for async/await)
const promisePool = pool.promise();

module.exports = promisePool;
