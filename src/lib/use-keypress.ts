import { useEffect, useState } from "react";

type KeyCode = "Escape" | "Backspace" | "ControlLeft" | "KeyW";

export function useKeyPress(callback: () => void, keyCodes: KeyCode[]): void {
  const [, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if ((keyCodes as string[]).includes(e.code)) {
        // e.preventDefault();
        setPressedKeys((prevKeys) => {
          const newKeys = new Set(prevKeys);
          newKeys.add(e.code);
          if (keyCodes.every((code) => newKeys.has(code))) {
            callback();
          }
          return newKeys;
        });
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if ((keyCodes as string[]).includes(e.code)) {
        // e.preventDefault();
        setPressedKeys((prevKeys) => {
          const newKeys = new Set(prevKeys);
          newKeys.delete(e.code);
          return newKeys;
        });
      }
    };
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [callback, setPressedKeys]);
}
