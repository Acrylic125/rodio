import { invoke } from "@tauri-apps/api/tauri";

export type ImageStat = {
  width: number;
  height: number;
  size: number;
};

export async function imageStat(filePath: string) {
  const stat: ImageStat = await invoke("image_stat", {
    filePath,
  });
  return stat;
}
