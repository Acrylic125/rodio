import { Button } from "@/components/ui/button";
import { Link, createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

const projects = [
  {
    id: "1",
    name: "Untitled Project",
    path: "/path/to/project",
  },
  {
    id: "2",
    name: "Untitled Project",
    path: "/path/to/project2",
  },
] as const;
// const projects = [];

function Index() {
  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <div className="w-full h-full flex flex-row gap-4 md:gap-8 lg:gap-12 max-w-screen-2xl">
        <section className="w-full flex flex-col h-full items-center justify-center p-4 md:p-8 lg:p-12 pr-0 md:pr-0 lg:pr-0">
          <div className="w-full flex flex-col gap-4 md:gap-8 lg:gap-12 max-w-lg">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl md:text-2xl lg:text-3xl text-gray-950 dark:text-gray-50 font-bold">
                Rodio
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Data labeling tool.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:gap-4">
              <Link to="/new-project">
                <Button
                  className="w-full text-left justify-start px-4 py-2 mdLpx-4 md:py-4 lg:px-6 lg:py-6"
                  variant="outline"
                >
                  New Project
                </Button>
              </Link>
              <Button
                className="w-full text-left justify-start px-4 py-2 mdLpx-4 md:py-4 lg:px-6 lg:py-6"
                variant="outline"
              >
                Load Existing Project
              </Button>
            </div>
          </div>
        </section>
        <section className="w-full flex flex-col p-4 md:p-8 lg:p-12 pl-0 md:pl-0 lg:pl-0">
          <ul className="flex flex-col w-full h-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-2 md:p-4 lg:p-6 rounded-md gap-1 md:gap-2 lg:gap-4">
            <h2 className="text-gray-500 font-medium">RECENTLY OPENED</h2>
            {projects.length > 0 ? (
              projects.map((project) => (
                <li
                  key={project.id}
                  tabIndex={0}
                  className="flex flex-col gap-1 w-full p-2 md:p-4 lg:p-6 border border-gray-300 dark:border-gray-700 rounded-md focus:bg-gray-200 dark:focus:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <h3 className="text-gray-800 dark:text-gray-200 text-lg">
                    {project.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {project.path}
                  </p>
                </li>
              ))
            ) : (
              <div className="w-full h-full flex flex-col gap-2 items-center justify-center">
                <h2 className="text-gray-800 dark:text-gray-200 text-xl">
                  No projects found
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Click "New Project" to get started
                </p>
              </div>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
