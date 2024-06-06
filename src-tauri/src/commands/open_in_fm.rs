#[tauri::command]
pub async fn open_in_file_manager(file_path: String) {
    showfile::show_path_in_file_manager(file_path);
}
