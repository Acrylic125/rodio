import { Label } from "./rodio-project";

export type EventTypes = {
  saveLabels:
    | {
        type: "success";
        filePath: string;
        labels: Label[];
      }
    | {
        type: "error";
        filePath: string;
        error: unknown;
      };
};
export type EventListener<T> = (event: { payload: T }) => void;

export type EventManager<T> = {
  listeners: Set<EventListener<T>>;
};

export function subscribe<T>(
  manager: EventManager<T>,
  listener: EventListener<T>
) {
  const { listeners } = manager;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function unsubscribe<T extends keyof EventTypes>(
  manager: EventManager<T>,
  listener: EventListener<T>
) {
  const { listeners } = manager;
  listeners.delete(listener);
}

export function dispatch<T>(manager: EventManager<T>, payload: T) {
  const { listeners } = manager;
  for (const listener of listeners) {
    try {
      listener({ payload });
    } catch (err) {
      console.error(err);
    }
  }
}
