import Database from "tauri-plugin-sql-api";
import {
  createDir,
  exists,
  readDir,
  readTextFile,
  writeFile,
} from "@tauri-apps/api/fs";
import path from "path";
import { Output, object, parse, string } from "valibot";

type Migration = {
  description: string;
  up: string;
  down: string;
};

async function migrateSQLite(
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
      console.log(sql);

      await db.execute(sql);
    }
    return;
  }

  const targetVersion = migrations.length; // Start at 1 for the first migration.
  if (currentRecord.version === targetVersion) {
    return;
  }

  // Migrations needs to be done sequentially.
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

export interface RodioProjectFile {
  readonly type: "file" | "dir";
  readonly relPath: string;

  load(projectPath: string): Promise<void>;
}

export class RodioProjectConfig implements RodioProjectFile {
  static ConfigSchema = object({
    name: string(),
    version: string(),
  });

  public readonly type = "file";
  public readonly relPath: string = "config.json";

  public values: Output<typeof RodioProjectConfig.ConfigSchema> = {
    name: "Untitled Project",
    version: "0.0.1",
  };

  public toJSON() {
    return this.values;
  }

  public async save(projectPath: string) {
    await writeFile(
      path.join(projectPath, this.relPath),
      JSON.stringify(this.values, null, 2)
    );
  }

  public async load(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    if (!(await exists(fp))) {
      await this.save(projectPath);
      return;
    }
    const configRawStr = await readTextFile(fp);
    const configRaw = JSON.parse(configRawStr);

    this.values = parse(RodioProjectConfig.ConfigSchema, configRaw);
  }
}

export class RodioProjectImages implements RodioProjectFile {
  public readonly type = "dir";
  public readonly relPath: string = "images";

  public async getImages() {
    const files = await readDir(this.relPath);
    return files.map((file) => ({
      path: file.path,
    }));
  }

  public async load(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    if (!(await exists(fp))) {
      await createDir(fp);
    }
  }
}

export class RodioProjectDB implements RodioProjectFile {
  public readonly type = "file";
  public readonly relPath: string = "project.db";
  private _db: Database | null = null;

  public async db() {
    if (this._db === null) {
      throw new Error("Database not loadialized");
    }
    return this._db;
  }

  public async load(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    if (!(await exists(fp))) {
      await writeFile(fp, "");
      return;
    }
    const db = await Database.load(fp);
    this._db = db;
  }
}

export class RodioProject {
  public config = new RodioProjectConfig();
  public images = new RodioProjectImages();
  public db = new RodioProjectDB();

  constructor(public projectPath: string) {}

  public async load() {
    if (!(await exists(this.projectPath))) {
      await createDir(this.projectPath, {
        recursive: true,
      });
    }
    const promises = this.getAllProjectFiles().map(async (projectFile) => {
      await projectFile.load(this.projectPath);
      return projectFile;
    });
    return Promise.allSettled(promises);
  }

  public configExists() {
    return exists(this.getProjectFileFullPath(this.config));
  }

  public getAllProjectFiles(): RodioProjectFile[] {
    return [this.config, this.images, this.db];
  }

  public getProjectFileFullPath(projectFile: RodioProjectFile) {
    return path.join(this.projectPath, projectFile.relPath);
  }

  public async projectFileExists(projectFile: RodioProjectFile) {
    return exists(this.getProjectFileFullPath(projectFile));
  }
}

export interface RodioAppFile {
  readonly type: "file" | "dir";
  readonly relPath: string;

  load(appPath: string): Promise<void>;
}

export class RodioAppDB implements RodioAppFile {
  static migrations: Migration[] = [
    {
      description: "Create projects table",
      up: `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(path)
      );
      `,
      down: `
        DROP TABLE projects;
      `,
    },
  ];

  public readonly type = "file";
  public readonly relPath: string = "app.db";
  private _db: Database | null = null;

  public async addProject(projectPath: string) {
    const db = await this.db();
    return db.execute(
      `INSERT INTO projects (path) VALUES ($1) ON CONFLICT(path) DO NOTHING;`,
      [projectPath]
    );
  }

  public async getProjects() {
    const db = await this.db();
    const projects = await db.select<
      {
        id: number;
        path: string;
      }[]
    >(`SELECT * FROM projects`);
    return projects;
  }

  public async db() {
    if (this._db === null) {
      throw new Error("Database not loadialized");
    }
    return this._db;
  }

  public async load(appPath: string) {
    const fp = path.join(appPath, this.relPath);
    if (!(await exists(fp))) {
      await writeFile(fp, "");
      return;
    }
    const db = await Database.load(`sqlite:${fp}`);

    await migrateSQLite(db, RodioAppDB.migrations, "up");

    this._db = db;
  }
}

export class RodioApp {
  public db = new RodioAppDB();

  constructor(public appPath: string) {}

  public getAllAppFiles(): RodioAppFile[] {
    return [this.db];
  }

  public async load() {
    if (!(await exists(this.appPath))) {
      await createDir(this.appPath, {
        recursive: true,
      });
    }
    const promises = this.getAllAppFiles().map(async (appFile) => {
      await appFile.load(this.appPath);
      return appFile;
    });
    return Promise.all(promises);
  }
}
