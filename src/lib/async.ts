import { Label } from "./rodio-project";

export class Lock {
  private _lock = false;
  private _queue: (() => void)[] = [];

  public isLocked() {
    return this._lock;
  }

  public async acquire() {
    if (!this._lock) {
      this._lock = true;
      return;
    }
    const promise = new Promise<void>((resolve) => {
      this._queue.push(resolve);
    });
    await promise;
  }

  public release() {
    if (this._queue.length === 0) {
      this._lock = false;
      return;
    }
    const resolve = this._queue.shift();
    if (resolve !== undefined) resolve();
  }
}

export class ProcessQueue<T> {
  private lock = new Lock();
  private nextId = 1; // Task id starts from 1.
  private accId = 0;

  public isLocked() {
    return this.lock.isLocked();
  }

  public async do(fn: () => Promise<T>) {
    const taskId = ++this.accId; // Make sure to add and get NOT get and add!

    await this.lock.acquire();
    const shouldRun = this.nextId === taskId;

    try {
      if (shouldRun) {
        const result = await fn();
        return {
          type: "success",
          result,
        } as const;
      }
      return {
        type: "skipped",
      } as const;
    } finally {
      if (shouldRun) {
        this.nextId = this.accId;
      }
      this.lock.release();
    }
  }
}

type ProjectFileAction = {
  type: "label";
  prev: Label;
  state: Label;
};

export class ProjectFileActionsHistory {
  private history: ProjectFileAction[] = [];
  private historyIndex = -1;

  public undo() {
    if (this.historyIndex < 0) return;
    const action = this.history[this.historyIndex];
    this.historyIndex--;
    return action;
  }

  public redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    return this.history[this.historyIndex];
  }

  public addAction(action: ProjectFileAction) {
    this.historyIndex++;
    if (this.historyIndex < this.history.length) {
      this.history = this.history.slice(0, this.historyIndex);
    }
    this.history.push(action);
  }
}
