import { useEffect, useRef } from "react";

type KeyCode = "Escape" | "Backspace" | "ControlLeft" | "KeyW";

export function useKeyPress(callback: () => void, keyCodes: KeyCode[]): void {
  const pressedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if ((keyCodes as string[]).includes(e.code)) {
        const newKeys = new Set(pressedKeysRef.current);
        newKeys.add(e.code);
        if (keyCodes.every((code) => newKeys.has(code))) {
          callback();
        }
        pressedKeysRef.current = newKeys;
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if ((keyCodes as string[]).includes(e.code)) {
        const newKeys = new Set(pressedKeysRef.current);
        newKeys.delete(e.code);
        pressedKeysRef.current = newKeys;
      }
    };
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [pressedKeysRef, callback]);
}
