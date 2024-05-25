import { invoke } from "@tauri-apps/api/tauri";

export async function isImage(filePath: string) {
  const isImage: boolean = await invoke("is_image", { filePath });
  return isImage;
}
