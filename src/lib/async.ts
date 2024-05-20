export class Lock {
  private _lock = false;
  private _queue: (() => void)[] = [];

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

export class ProcessQueue<K, T> {
  private processMap: Map<
    K,
    {
      lock: Lock;
      nextId: number;
    }
  > = new Map();
  public overrideUniqueness = true;

  public async do(key: K, fn: () => Promise<T>) {
    let process = this.processMap.get(key);
    if (process === undefined) {
      process = {
        lock: new Lock(),
        nextId: 0,
      };
      this.processMap.set(key, process);
    }
    const taskId = process.nextId++;

    await process.lock.acquire();
    try {
      const currentProcess = this.processMap.get(key);
      if (
        !this.overrideUniqueness ||
        currentProcess === undefined ||
        currentProcess.nextId === taskId
      ) {
        const result = await fn();
        return {
          type: "success",
          result,
        };
      }
      return {
        type: "skipped",
      };
    } finally {
      process.lock.release();
    }
  }
}
