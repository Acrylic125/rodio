import { RodioApp } from "@/lib/rodio";
import { resolveError } from "@/lib/utils";
import { appDataDir } from "@tauri-apps/api/path";
import { useEffect } from "react";
import { StoreApi, UseBoundStore, create } from "zustand";

type AppStore = {
  loadStatus:
    | {
        state: "idle" | "loading" | "success";
      }
    | {
        state: "error";
        message: string;
      };
  app: RodioApp | null;
  load: () => Promise<void>;
};

export const useAppStore: UseBoundStore<StoreApi<AppStore>> = create((set) => ({
  loadStatus: {
    state: "idle",
  },
  app: null,
  load: async () => {
    set({
      loadStatus: {
        state: "loading",
      },
    });
    try {
      const path = await appDataDir();
      const app = new RodioApp(path);
      await app.load();
      set({
        app,
      });
    } catch (error) {
      set({
        loadStatus: {
          state: "error",
          message: resolveError(error),
        },
      });
      console.error(error);
      throw error;
    }
  },
}));

export function useAppStoreLoad(appStore: Pick<AppStore, "app" | "load">) {
  useEffect(() => {
    if (appStore.app === null) appStore.load();
  }, [appStore.app, appStore.load]);
}
