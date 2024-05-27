import { invoke } from "@tauri-apps/api/tauri";

export async function imageOptimiser(
  filePath: string,
  width: number,
  height: number,
  cacheDir: string
) {
  const stat: string = await invoke("image_optimiser", {
    filePath,
    width: Math.round(width),
    height: Math.round(height),
    cacheDir,
  });
  return stat;
}
