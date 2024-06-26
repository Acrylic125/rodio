import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../ui/dialog";
import {
  ExportOptions,
  ExportTypes,
  ExportModalSelectExportType,
} from "./select-export-type";
import { ExportPreview } from "./export-preview";
import { ExportProgress } from "./export-progress";
import useExportStore, { generateExportDirname } from "./export-store";
import { ExportDistributionType } from "./export-types";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import path from "path";

const ExportInProgressPageId = 2;

export function ExportModal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const exportStore = useExportStore(({ isRunning, save }) => {
    return {
      isRunning,
      save,
    };
  });
  const [page, setPage] = useState(
    exportStore.isRunning() ? ExportInProgressPageId : 0
  );
  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(page - 1);
  const onOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        setPage((prev) => {
          if (prev !== ExportInProgressPageId) {
            return 0;
          }
          return prev;
        });
      }
    },
    [setPage, setIsOpen]
  );
  const [options, setExportOptions] = useState<ExportOptions>({
    type: ExportTypes[0],
    onlyExportLabelled: true,
    deleteOldExport: false,
  });
  const currentProjectStore = useCurrentProjectStore(({ project }) => ({
    project,
  }));

  let content = null;
  if (page === 0) {
    content = (
      <ExportModalSelectExportType
        nextPage={nextPage}
        options={options}
        onOptionsChange={setExportOptions}
      />
    );
  } else if (page === 1) {
    content = (
      <ExportPreview
        prevPage={prevPage}
        onRequestExport={async (
          images: string[],
          exportTypeMap: Map<string, ExportDistributionType>
        ) => {
          if (currentProjectStore.project === null) {
            return;
          }
          const classes = await currentProjectStore.project.db.getClasses();
          const classesIdToIndex = new Map(
            classes.map((cls, index) => [cls.id, index])
          );
          exportStore.save({
            data: {
              images: images
                .map((imagePath) => {
                  const distributioinType = exportTypeMap.get(imagePath);
                  if (!distributioinType) {
                    return null;
                  }
                  return {
                    path: imagePath,
                    type: distributioinType,
                  };
                })
                .filter(
                  (file): file is Exclude<typeof file, null> => file !== null
                ),
              classes,
              getLabelsForImage: async (imagePath: string) => {
                if (currentProjectStore.project === null) {
                  return [];
                }
                const labels =
                  await currentProjectStore.project.db.getLabels(imagePath);
                return labels.map((label) => {
                  return {
                    start: label.start,
                    end: label.end,
                    classIndex: classesIdToIndex.get(label.class) ?? 0,
                  };
                });
              },
            },
            exportType: options.type,
            exportDir: path.join(
              currentProjectStore.project.getProjectFileFullPath(
                currentProjectStore.project.exports
              ),
              generateExportDirname(options.type)
            ),
          });
          setPage(ExportInProgressPageId);
        }}
        options={options}
      />
    );
  } else if (page === ExportInProgressPageId) {
    content = (
      <ExportProgress
        onRequestComplete={() => {
          setPage(0);
          setIsOpen(false);
        }}
        onRequestConfigureExport={() => {
          setPage(1);
        }}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
