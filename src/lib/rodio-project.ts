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
import { Pos } from "@/components/project/label-anchors";
import { isImage } from "@/commands/is-image";
import { ImageStat, imageStat } from "@/commands/image-stat";

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

export type RodioImage = {
  path: string;
  stat: ImageStat;
};

export function isRodioImageTooLarge(image: RodioImage) {
  return image.stat.size > 200_000; // 200 KB
}

export class RodioProjectCache implements RodioProjectFile {
  public readonly type = "dir";
  public readonly relPath: string = "cache";

  public async load(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    if (!(await exists(fp))) {
      await createDir(fp);
    }
  }
}

export class RodioProjectImages implements RodioProjectFile {
  public readonly type = "dir";
  public readonly relPath: string = "images";

  public async getImages(projectPath: string): Promise<RodioImage[]> {
    const fp = path.join(projectPath, this.relPath);
    const files = await readDir(fp);
    const res = await Promise.allSettled(
      files.map(async (file) => {
        const isImageFile = await isImage(file.path);
        if (!isImageFile) {
          return {
            path: file.path,
            isImageFile: false,
          } as const;
        }
        const stat = await imageStat(file.path);
        return {
          path: file.path,
          isImageFile: true,
          stat,
        } as const;
      })
    );

    return res
      .map((fileRes) => {
        if (fileRes.status === "rejected") {
          console.error(fileRes.reason);
          return null;
        }
        if (!fileRes.value.isImageFile) {
          return null;
        }
        return {
          path: fileRes.value.path,
          stat: fileRes.value.stat,
        };
      })
      .filter((file): file is Exclude<typeof file, null> => file !== null);
  }

  public async load(projectPath: string) {
    const fp = path.join(projectPath, this.relPath);
    if (!(await exists(fp))) {
      await createDir(fp);
    }
  }
}

export type LabelId = string;
export type Label = {
  id: LabelId;
  class: LabelClassId;
  start: Pos;
  end: Pos;
};

export type LabelClassId = number;
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
    {
      description: "Create labels table",
      up: `
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        start_x FLOAT NOT NULL,
        start_y FLOAT NOT NULL,
        end_x FLOAT NOT NULL,
        end_y FLOAT NOT NULL,
        class_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      );
      `,
      down: `
        DROP TABLE IF EXISTS labels;
      `,
    },
  ];

  public async deleteLabel(labelId: LabelId) {
    const db = await this.db();
    return db.execute(`DELETE FROM labels WHERE id = $1;`, [labelId]);
  }

  public async updateLabel(label: Label) {
    const db = await this.db();
    return db.execute(
      `UPDATE labels SET start_x = $1, start_y = $2, end_x = $3, end_y = $4, class_id = $5 WHERE id = $6;`,
      [
        label.start.x,
        label.start.y,
        label.end.x,
        label.end.y,
        label.class,
        label.id,
      ]
    );
  }

  public async setLabels(filePath: string, labels: Label[]) {
    const db = await this.db();

    let sql = `
      DELETE FROM labels WHERE path = $1;
    `;
    const params: any[] = [filePath];
    for (const label of labels) {
      let lastParamIndex = params.length; // 1-indexed.
      sql += `INSERT INTO labels (id, start_x, start_y, end_x, end_y, class_id, path) 
              VALUES ($${lastParamIndex + 1}, $${lastParamIndex + 2}, $${lastParamIndex + 3}, $${lastParamIndex + 4}, $${lastParamIndex + 5}, $${lastParamIndex + 6}, $${lastParamIndex + 7});`;
      params.push(
        label.id,
        label.start.x,
        label.start.y,
        label.end.x,
        label.end.y,
        label.class,
        filePath
      );
    }

    return db.execute(sql, params);
  }

  public async addLabel(filePath: string, label: Label) {
    const db = await this.db();
    return db.execute(
      `INSERT INTO labels (id, start_x, start_y, end_x, end_y, class_id, path) VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        label.id,
        label.start.x,
        label.start.y,
        label.end.x,
        label.end.y,
        label.class,
        filePath,
      ]
    );
  }

  public async getLabels(filePath: string) {
    const db = await this.db();
    const labels = await db.select<
      {
        id: LabelId;
        start_x: number;
        start_y: number;
        end_x: number;
        end_y: number;
        class_id: LabelClassId;
      }[]
    >(`SELECT * FROM labels WHERE path = $1`, [filePath]);
    return labels.map((label) => {
      return {
        id: label.id,
        start: { x: label.start_x, y: label.start_y },
        end: { x: label.end_x, y: label.end_y },
        class: label.class_id,
      };
    });
  }

  public async addClass(name: string, color: string) {
    const db = await this.db();
    const res = await db.execute(
      `INSERT INTO classes (name, color) VALUES ($1, $2);`,
      [name, color]
    );
    return res.lastInsertId;
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
  public cache = new RodioProjectCache();

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
    return [this.config, this.images, this.db, this.cache];
  }

  public getProjectFileFullPath(projectFile: RodioProjectFile) {
    return path.join(this.projectPath, projectFile.relPath);
  }

  public async projectFileExists(projectFile: RodioProjectFile) {
    return exists(this.getProjectFileFullPath(projectFile));
  }
}
