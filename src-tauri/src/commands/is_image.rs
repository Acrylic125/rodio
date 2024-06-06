use mime_guess::from_path;
use std::path::Path;

#[tauri::command]
pub async fn is_image(file_path: String) -> bool {
    if Path::new(&file_path).exists() {
        let mime_type = from_path(&file_path).first_or_octet_stream();
        mime_type.type_() == "image"
    } else {
        false
    }
}
