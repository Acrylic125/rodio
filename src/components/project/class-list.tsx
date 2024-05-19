import { useState } from "react";
import { ColorPicker, colors } from "../ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Loader2, PlusIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { cn, resolveError } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { useMutation } from "@tanstack/react-query";

export function CreateOrEditClassModal({
  isOpen,
  setIsOpen,
  onRequestSave,
  error,
  isPending,
  mode,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onRequestSave?: (cls: { name: string; color: string }) => void;
  error?: string | null;
  isPending?: boolean;
  mode: "create" | "edit";
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(
    colors[Math.floor(Math.random() * colors.length)]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md md:max-w-lg lg:max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRequestSave?.({ name, color });
          }}
        >
          {mode === "create" ? (
            <DialogHeader>
              <DialogTitle>Create Class</DialogTitle>
              <DialogDescription>
                Specify the class to create.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Specify the changes to make to this class.
              </DialogDescription>
            </DialogHeader>
          )}
          <div className="grid gap-4 py-4">
            <label className="flex flex-col gap-2">
              <span>Name</span>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                name="Name"
                placeholder="Class Name (e.g. bus_number)"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span>Color</span>
              <ColorPicker
                background={color}
                setBackground={setColor}
                className="w-full"
              />
            </label>
          </div>

          {error && (
            <Alert className="mb-4" variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="flex flex-row gap-2"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClassList({ isPending }: { isPending?: boolean }) {
  const [createClassModalOpen, setCreateClassModalOpen] = useState(false);
  const currentProjectStore = useCurrentProjectStore(
    ({ classesMap, project, selectedClass, selectClass, setClassesMap }) => {
      return {
        classesMap,
        project,
        selectedClass,
        selectClass,
        setClassesMap,
      };
    }
  );
  const createClassMut = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (currentProjectStore.project === null) return;
      const id = await currentProjectStore.project.db.addClass(name, color);

      const newClassesMap = new Map(currentProjectStore.classesMap);
      newClassesMap.set(id, { id, name, color });
      currentProjectStore.setClassesMap(newClassesMap);
    },
    onSuccess: () => {
      setCreateClassModalOpen(false);
    },
  });

  return (
    <>
      <CreateOrEditClassModal
        isOpen={createClassModalOpen}
        setIsOpen={setCreateClassModalOpen}
        onRequestSave={createClassMut.mutate}
        isPending={createClassMut.isPending}
        error={
          createClassMut.error ? resolveError(createClassMut.error) : undefined
        }
        mode="create"
      />

      <div className="flex flex-row items-baseline justify-between gap-2 p-2 border-b border-gray-300 dark:border-gray-700 select-none">
        <h2 className="text-gray-500 font-medium">CLASSES</h2>
        <Button
          className="px-0 py-0 w-8 h-8 aspect-square"
          variant="secondary"
          onClick={(e) => {
            e.preventDefault();
            setCreateClassModalOpen(true);
          }}
          disabled={isPending}
        >
          <PlusIcon className="w-6 h-6" />
        </Button>
      </div>

      <ul className="flex flex-col gap-0 py-2">
        {isPending
          ? new Array(5).fill(null).map((_, i) => (
              <li key={i} className="p-1">
                <Skeleton className="w-full h-8" />
              </li>
            ))
          : Array.from(currentProjectStore.classesMap.values()).map((cls) => (
              <li
                key={cls.id}
                className="px-1 cursor-pointer"
                onClick={() => currentProjectStore.selectClass(cls.id)}
              >
                <div
                  className={cn(
                    "flex flex-row items-center gap-2 p-1 transition ease-in-out duration-200",
                    {
                      "bg-primary text-gray-50 dark:text-gray-950 rounded-sm":
                        cls.id === currentProjectStore.selectedClass,
                    }
                  )}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  <p>{cls.name}</p>
                </div>
              </li>
            ))}
      </ul>
    </>
  );
}
