import { invoke } from "@tauri-apps/api/tauri";

export async function openInFileManager(filePath: string) {
  await invoke("open_in_file_manager", { filePath });
}
