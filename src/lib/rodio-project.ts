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
import { Migration, migrateSQLite } from "./db";

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

  public async getImages(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    const files = await readDir(fp);
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

export type LabelClassId = string;
export type LabelClass = {
  id: LabelClassId;
  name: string;
  color: string;
};

export class RodioProjectDB implements RodioProjectFile {
  public readonly type = "file";
  public readonly relPath: string = "project.db";
  private _db: Database | null = null;

  static migrations: Migration[] = [
    {
      description: "Create classes table",
      up: `
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
      down: `
        DROP TABLE IF EXISTS classes;
      `,
    },
  ];

  public async addClass(name: string, color: string) {
    const db = await this.db();
    return db.execute(`INSERT INTO classes (name, color) VALUES ($1, $2);`, [
      name,
      color,
    ]);
  }

  public async getClasses() {
    const db = await this.db();
    const classes = await db.select<LabelClass[]>(`SELECT * FROM classes`);
    return classes;
  }

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
    const db = await Database.load(`sqlite:${fp}`);
    await migrateSQLite(db, RodioProjectDB.migrations, "up");
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
    await Promise.all(promises);
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
