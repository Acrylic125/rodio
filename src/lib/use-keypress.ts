import { RefObject, useEffect, useRef } from "react";

type KeyCode = "Escape" | "Backspace" | "ControlLeft" | "KeyW";

export function useKeyPress<T extends HTMLElement>(
  callback: () => void,
  keyCodes: KeyCode[],
  ref?: RefObject<T>
): void {
  const pressedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const downHandler = (e: Event) => {
      if (!(e instanceof KeyboardEvent)) return;
      if ((keyCodes as string[]).includes(e.code)) {
        const newKeys = new Set(pressedKeysRef.current);
        newKeys.add(e.code);
        if (keyCodes.every((code) => newKeys.has(code))) {
          callback();
        }
        pressedKeysRef.current = newKeys;
      }
    };
    const upHandler = (e: Event) => {
      if (!(e instanceof KeyboardEvent)) return;
      if ((keyCodes as string[]).includes(e.code)) {
        const newKeys = new Set(pressedKeysRef.current);
        newKeys.delete(e.code);
        pressedKeysRef.current = newKeys;
      }
    };

    const ele = ref === undefined ? document : ref.current;
    if (ele === null) return;
    ele.addEventListener("keydown", downHandler);
    ele.addEventListener("keyup", upHandler);
    return () => {
      ele.removeEventListener("keydown", downHandler);
      ele.removeEventListener("keyup", upHandler);
    };
  }, [pressedKeysRef, ref, ref?.current, callback]);
}
