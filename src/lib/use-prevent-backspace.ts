import { useEffect } from "react";

var types = [
  "text",
  "password",
  "file",
  "search",
  "email",
  "number",
  "date",
  "color",
  "datetime",
  "datetime-local",
  "month",
  "range",
  "search",
  "tel",
  "time",
  "url",
  "week",
];

export function usePreventBackspace() {
  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === "Backspace") {
        var target = e.target;
        let shouldPrevent = true;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          if (!(target.readOnly || target.disabled)) {
            if (types.indexOf(target.type.toLowerCase()) > -1) {
              shouldPrevent = false;
            }
          }
        } else if (target instanceof HTMLElement) {
          if (target.isContentEditable) {
            shouldPrevent = false;
          }
        }
        if (shouldPrevent) e.preventDefault();
      }
    };
    window.addEventListener("keydown", downHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  }, []);
}
