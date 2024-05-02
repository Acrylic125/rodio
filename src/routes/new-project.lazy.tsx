import { Link, createLazyFileRoute } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createLazyFileRoute("/new-project")({
  component: NewProject,
});

function NewProject() {
  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <section className="w-full h-full flex flex-col gap-4 md:gap-8 lg:gap-12 max-w-screen-xl p-4 md:p-8 lg:p-12">
        <div className="flex flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/">
                  <BreadcrumbLink>Home</BreadcrumbLink>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Project</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-xl md:text-2xl lg:text-3xl text-gray-950 dark:text-gray-50 font-bold">
            New Project
          </h1>
        </div>
        <form className="flex flex-col gap-4 md:gap-8 lg:gap-12">
          <div className="flex flex-col gap-2 md:gap-4 lg:gap-6">
            <label className="flex flex-col gap-2">
              <p>Project Name</p>
              <Input
                placeholder="Project name (e.g. Bus Detector)"
                className="h-12"
              />
            </label>
            <label className="flex flex-col gap-2">
              <p>Project Path</p>
              <Input type="file" className="h-12" />
            </label>
          </div>
          <div className="flex flex-row gap-2">
            <Link to="/">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
