export type EventTypes = {
  saveLabels: {
    type: "success" | "error";
    filePath: string;
  };
};
type Listener<T extends keyof EventTypes> = (event: {
  type: T;
  payload: EventTypes[T];
}) => void;

const saveLabelsListeners = new Set<Listener<"saveLabels">>();

function getListeners<T extends keyof EventTypes>(
  type: T
): Set<Listener<T>> | undefined {
  switch (type) {
    case "saveLabels":
      return saveLabelsListeners;
  }
}

export function subscribe<T extends keyof EventTypes>(
  type: T,
  listener: Listener<T>
) {
  const listeners = getListeners(type);
  if (!listeners) {
    throw new Error(`Event type ${type} does not exist`);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function unsubscribe<T extends keyof EventTypes>(
  type: T,
  listener: Listener<T>
) {
  const listeners = getListeners(type);
  if (!listeners) {
    throw new Error(`Event type ${type} does not exist`);
  }
  listeners.delete(listener);
}

export function dispatch<T extends keyof EventTypes>(
  type: T,
  payload: EventTypes[T]
) {
  const listeners = getListeners(type);
  if (!listeners) {
    throw new Error(`Event type ${type} does not exist`);
  }

  for (const listener of listeners) {
    try {
      listener({ type, payload });
    } catch (err) {
      console.error(err);
    }
  }
}
