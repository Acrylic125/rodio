import { invoke } from "@tauri-apps/api/tauri";

export async function imageOptimiser(
  filePath: string,
  width: number,
  height: number
) {
  const stat: string = await invoke("image_optimiser", {
    filePath,
    width,
    height,
  });
  return stat;
}
