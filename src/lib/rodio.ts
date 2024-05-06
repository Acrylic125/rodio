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

export interface RodioProjectFile {
  readonly type: "file" | "dir";
  readonly relPath: string;

  init(projectPath: string): Promise<void>;
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

  public async init(projectPath: string) {
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

  public async init(projectPath: string) {
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
      throw new Error("Database not initialized");
    }
    return this._db;
  }

  public async init(projectPath: string) {
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

  public async init() {
    if (!(await exists(this.projectPath))) {
      await createDir(this.projectPath, {
        recursive: true,
      });
    }
    const promises = this.getAllProjectFiles().map(async (projectFile) => {
      await projectFile.init(this.projectPath);
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
