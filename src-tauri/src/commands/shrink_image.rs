use std::path::Path;

#[tauri::command]
pub async fn shrink_image(file_path: String, width: u32, height: u32) -> Result<(), String> {
    let img = match image::open(&Path::new(&file_path)) {
        Ok(img) => img,
        Err(e) => return Err(e.to_string()),
    };
    match img
        .resize(width, height, image::imageops::FilterType::Lanczos3)
        .save(&Path::new(&file_path))
    {
        Ok(_) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
}
