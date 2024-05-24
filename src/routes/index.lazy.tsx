import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RodioProjectConfig } from "@/lib/rodio-project";
import { resolveError } from "@/lib/utils";
import { useAppStore, useAppStoreLoad } from "@/stores/app-store";
import { useQuery } from "@tanstack/react-query";
import { Link, createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { open } from "@tauri-apps/api/dialog";
import { appDataDir } from "@tauri-apps/api/path";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function ProjectListItem(
  props:
    | { type: "success"; path: string; name: string; onClick: () => void }
    | { type: "error"; error: string; path: string }
) {
  if (props.type === "error") {
    return (
      <li
        tabIndex={0}
        className="flex flex-col gap-1 w-full p-2 md:p-4 lg:p-6 border border-gray-300 dark:border-gray-700 rounded-md focus:bg-gray-200 dark:focus:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 opacity-75"
      >
        <h3 className="text-red-500 text-lg">{props.error}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{props.path}</p>
      </li>
    );
  }
  return (
    <li
      tabIndex={0}
      onClick={props.onClick}
      className="flex flex-col gap-1 w-full p-2 md:p-4 lg:p-6 border border-gray-300 dark:border-gray-700 rounded-md focus:bg-gray-200 dark:focus:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
    >
      <h3 className="text-gray-800 dark:text-gray-200 text-lg cursor-pointer">
        {props.name}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm cursor-pointer">
        {props.path}
      </p>
    </li>
  );
}

function ProjectsList() {
  const navigate = useNavigate({ from: "/new-project" });
  const appStore = useAppStore((state) => {
    return {
      loadStatus: state.loadStatus,
      app: state.app,
    };
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    enabled: appStore.app !== null,
    queryFn: async () => {
      if (appStore.app === null) return [];
      const _projects = await appStore.app.db.getProjects();
      const projects = await Promise.allSettled(
        _projects.map(async (_project) => {
          try {
            const projectFile = new RodioProjectConfig();
            // throw new Error("Not implemented");
            await projectFile.load(_project.path);
            return {
              type: "success",
              name: projectFile.values.name,
              path: _project.path,
            } as const;
          } catch (error) {
            console.error(error);
            return {
              type: "error",
              error: resolveError(error),
              path: _project.path,
            } as const;
          }
        })
      );
      return projects
        .map((project) => {
          if (project.status === "fulfilled") return project.value;
          return null;
        })
        .filter(
          (project): project is Exclude<typeof project, null> =>
            project !== null
        );
    },
  });

  let list = null;
  if (projectsQuery.isLoading) {
    list = Array.from({ length: 3 }).map((_, i) => (
      <li key={i} className="flex flex-col gap-1">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
      </li>
    ));
  } else {
    const projects = projectsQuery.data ?? [];
    list =
      projects.length > 0 ? (
        projects.map((project) => (
          <ProjectListItem
            key={project.path}
            {...(project.type === "success"
              ? {
                  type: "success",
                  name: project.name,
                  onClick: () => {
                    navigate({
                      to: "/project/$path",
                      params: { path: encodeURIComponent(project.path) },
                    });
                  },
                }
              : {
                  type: "error",
                  error: project.error,
                })}
            path={project.path}
          />
        ))
      ) : (
        <div className="w-full h-full flex flex-col gap-2 items-center justify-center">
          <h2 className="text-gray-800 dark:text-gray-200 text-xl">
            No projects found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Click "New Project" or "Load Existing Project" to get started
          </p>
        </div>
      );
  }

  return (
    <ul className="flex flex-col w-full h-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-2 md:p-4 lg:p-6 rounded-md gap-1 md:gap-2 lg:gap-4">
      <h2 className="text-gray-500 font-medium">RECENTLY OPENED</h2>
      {list}
    </ul>
  );
}

function ProjectActionsSection() {
  const navigate = useNavigate({ from: "/new-project" });
  const app = useAppStore((state) => {
    return {
      app: state.app,
    };
  });

  return (
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
        onClick={async (e) => {
          e.preventDefault();
          if (app.app === null) return;

          const selected = await open({
            directory: true,
            multiple: false,
            defaultPath: await appDataDir(),
          });
          if (!selected) return;
          let selectedProjectPath = Array.isArray(selected)
            ? selected[0]
            : selected;

          await app.app.db.addProject(selectedProjectPath);
          navigate({
            to: "/project/$path",
            params: { path: encodeURIComponent(selectedProjectPath) },
          });
        }}
      >
        Load Existing Project
      </Button>
    </div>
  );
}

// const processQueue = new ProcessQueue<string, string>();
// processQueue.overrideUniqueness = false;

function Index() {
  const appStore = useAppStore((state) => {
    return {
      app: state.app,
      load: state.load,
    };
  });
  useAppStoreLoad(appStore);
  // useEffect(() => {
  //   let value = 0;
  //   const timer = setInterval(async () => {
  //     const res = value++;
  //     const v = await processQueue.do("hello", async () => {
  //       const result = await new Promise<string>((resolve, reject) => {
  //         setTimeout(() => {
  //           reject("Test");
  //           // resolve(`${res}`);
  //         }, 3000);
  //       });
  //       return result;
  //     });
  //     console.log(`${res} => ${v.type} ${v.result}`);
  //   }, 1000);
  //   return () => {
  //     clearInterval(timer);
  //   };
  // }, []);

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
            <ProjectActionsSection />
          </div>
        </section>
        <section className="w-full flex flex-col p-4 md:p-8 lg:p-12 pl-0 md:pl-0 lg:pl-0">
          <ProjectsList />
        </section>
      </div>
    </main>
  );
}
