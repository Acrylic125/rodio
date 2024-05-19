import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { object, parse, string } from "valibot";
import { listen } from "@tauri-apps/api/event";
import { usePreventBackspace } from "@/lib/use-prevent-backspace";
// import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: Root,
});

const GotoEventSchema = object({
  goto: string(),
});

const events = {
  goto: GotoEventSchema,
} as const;

function unwrapEvent<K extends keyof typeof events, T>(
  name: K,
  fn: (name: K, schema: (typeof events)[K]) => T
): T {
  return fn(name, events[name]);
}

function Root() {
  const navigate = useNavigate({});
  usePreventBackspace();
  useEffect(() => {
    const cancel = unwrapEvent("goto", (name, schema) => {
      return listen(name, (event) => {
        const { goto } = parse(schema, event.payload);
        navigate({
          to: goto,
        });

        console.log("goto", goto);
      });
    });
    return () => {
      cancel.then((f) => f());
    };
  }, []);
  return (
    <>
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}
