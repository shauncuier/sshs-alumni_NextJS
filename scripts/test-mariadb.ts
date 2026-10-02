import "dotenv/config";
import mariadb from "mariadb";

async function testConnection() {
  const url = process.env.DATABASE_URL;
  console.log("Testing connection to:", url?.replace(/:[^:@]+@/, ":***@"));

  const pool = mariadb.createPool({
    host: "3s-soft.com",
    port: 3306,
    user: "nvfzavtm_ssghs_admin",
    password: "E39#ll5Ii57TKkXr",
    database: "nvfzavtm_ssghs",
    connectTimeout: 10000,
  });

  try {
    const conn = await pool.getConnection();
    console.log("Connected successfully to MariaDB/MySQL!");
    const rows = await conn.query("SELECT 1 as val, DATABASE() as db");
    console.log("Query result:", rows);
    const users = await conn.query("SELECT COUNT(*) as count FROM User");
    console.log("User count in DB:", users);
    conn.release();
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
