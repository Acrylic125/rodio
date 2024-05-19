import Database from "tauri-plugin-sql-api";

export type Migration = {
  description: string;
  up: string;
  down: string;
};

export async function migrateSQLite(
  db: Database,
  migrations: Migration[],
  mode: "up" | "down" = "up"
) {
  // Ensure the database has the migrations table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      version INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const current = await db.select<
    {
      id: number;
      version: number;
    }[]
  >(`
    SELECT id, version FROM migrations LIMIT 1;
  `);

  let currentRecord = {
    id: 0,
    version: 0,
  };
  if (current.length === 0) {
    const queryResult = await db.execute(`
      INSERT INTO migrations (version) VALUES (0);
    `);
    currentRecord.id = queryResult.lastInsertId;
  } else {
    const _currentRecord = current[0];
    currentRecord = {
      id: _currentRecord.id,
      version: _currentRecord.version,
    };
  }

  if (mode === "down") {
    const targetVersion = 0;
    if (currentRecord.version === targetVersion) {
      return;
    }

    // Migrations needs to be done sequentially.
    for (let i = currentRecord.version; i > targetVersion; i--) {
      const migration = migrations[i - 1];

      const sql = `
      ${migration.down}

      UPDATE migrations SET version = ${i - 1} WHERE id = ${currentRecord.id};
      `;

      await db.execute(sql);
    }
    return;
  }

  const targetVersion = migrations.length; // Start at 1 for the first migration.
  if (currentRecord.version === targetVersion) {
    return;
  }

  // Migrations needs to be done sequentially.
  console.log(
    `Migrate up to version ${targetVersion} from ${currentRecord.version}`
  );
  for (let i = currentRecord.version; i < targetVersion; i++) {
    const migration = migrations[i];

    const sql = `
    ${migration.up}

    UPDATE migrations SET version = ${i + 1} WHERE id = ${currentRecord.id};
    `;
    console.log(sql);

    await db.execute(sql);
  }
}
