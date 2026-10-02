import mariadb from "mariadb";

async function testLocalMySQL() {
  const attempts = [
    { user: "root", password: "" },
    { user: "root", password: "password" },
    { user: "root", password: "root" },
    { user: "root", password: "test" },
  ];

  for (const cred of attempts) {
    try {
      const conn = await mariadb.createConnection({
        host: "127.0.0.1",
        port: 3306,
        user: cred.user,
        password: cred.password,
        allowPublicKeyRetrieval: true,
        connectTimeout: 2000,
      });
      console.log("SUCCESS connecting locally with:", cred);
      const databases = await conn.query("SHOW DATABASES");
      console.log("Databases on local MySQL:", databases);
      await conn.end();
      return;
    } catch (err: unknown) {
      console.log("Failed attempt:", cred.user, "/", cred.password ? "***" : "empty", (err as Error).message);
    }
  }
}

testLocalMySQL();
