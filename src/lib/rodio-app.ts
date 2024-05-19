import Database from "tauri-plugin-sql-api";
import { createDir, exists, writeFile } from "@tauri-apps/api/fs";
import path from "path";
import { Migration, migrateSQLite } from "./db";

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
