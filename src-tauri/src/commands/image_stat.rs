use image::io::Reader as ImageReader;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ImageStat {
    width: u32,
    height: u32,
    size: u64,
}

#[tauri::command]
pub async fn image_stat(file_path: String) -> Result<ImageStat, String> {
    if Path::new(&file_path).exists() {
        match ImageReader::open(&file_path) {
            Ok(reader) => {
                let metadata = match fs::metadata(&file_path) {
                    Ok(metadata) => metadata,
                    Err(_) => return Err("Failed to get image metadata".to_string()),
                };
                let file_size = metadata.len();
                let dimensions = match reader.into_dimensions() {
                    Ok(dimensions) => dimensions,
                    Err(_) => return Err("Failed to get image dimensions".to_string()),
                };
                Ok(ImageStat {
                    width: dimensions.0,
                    height: dimensions.1,
                    size: file_size,
                })
            }
            Err(_) => Err("Failed to open image".to_string()),
        }
    } else {
        Err("File not found".to_string())
    }
}
