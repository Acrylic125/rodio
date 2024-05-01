import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="bg-gray-950 w-screen h-svh text-white">
      <h1>Hello world!</h1>
    </main>
  );
}
