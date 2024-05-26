use std::path::Path;

const IMAGES_CACHE_DIR: &str = "images";

pub enum ImageResizeThreshold {
    VerySmall,
    Small,
    Medium,
    Large,
    VeryLarge,
}

struct ThresholdPreset {
    desired_value: u32,
    prefix: &'static str,
}

impl ImageResizeThreshold {
    fn value(&self) -> ThresholdPreset {
        match *self {
            ImageResizeThreshold::VerySmall => ThresholdPreset {
                desired_value: 240,
                prefix: "very_small",
            },
            ImageResizeThreshold::Small => ThresholdPreset {
                desired_value: 480,
                prefix: "small",
            },
            ImageResizeThreshold::Medium => ThresholdPreset {
                desired_value: 640,
                prefix: "medium",
            },
            ImageResizeThreshold::Large => ThresholdPreset {
                desired_value: 1080,
                prefix: "large",
            },
            ImageResizeThreshold::VeryLarge => ThresholdPreset {
                desired_value: 1440,
                prefix: "very_large",
            },
        }
    }
}

#[tauri::command]
pub async fn image_optimiser(
    app_handle: tauri::AppHandle,
    file_path: String,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let high = width.max(height);
    let cache_dir = match app_handle.path_resolver().app_cache_dir() {
        Some(cache_dir) => cache_dir,
        None => return Err("Failed to get cache directory".to_string()),
    };
    let desired_threshold = match high {
        high if high <= ImageResizeThreshold::VerySmall as u32 => ImageResizeThreshold::VerySmall,
        high if high <= ImageResizeThreshold::Small as u32 => ImageResizeThreshold::Small,
        high if high <= ImageResizeThreshold::Medium as u32 => ImageResizeThreshold::Medium,
        high if high <= ImageResizeThreshold::Large as u32 => ImageResizeThreshold::Large,
        _ => ImageResizeThreshold::VeryLarge,
    }
    .value();
    let current_file_name = match Path::new(&file_path).file_name() {
        Some(file_name) => file_name,
        None => return Err("Failed to get file name".to_string()),
    };
    let file_name_with_prefix = format!(
        "{}_{}",
        desired_threshold.prefix,
        current_file_name.to_string_lossy()
    );

    let image_cache_full_path = cache_dir
        .join(IMAGES_CACHE_DIR)
        .join(&file_name_with_prefix);
    if image_cache_full_path.exists() {
        return Ok(image_cache_full_path.to_string_lossy().to_string());
    }

    let img = match image::open(&Path::new(&file_path)) {
        Ok(img) => img,
        Err(e) => return Err(e.to_string()),
    };

    let (new_width, new_height) = if width > height {
        if width <= desired_threshold.desired_value {
            return Ok(file_path);
        } else {
            (
                desired_threshold.desired_value,
                (desired_threshold.desired_value as f32 / width as f32 * height as f32) as u32,
            )
        }
    } else {
        if height <= desired_threshold.desired_value {
            return Ok(file_path);
        } else {
            (
                (desired_threshold.desired_value as f32 / height as f32 * width as f32) as u32,
                desired_threshold.desired_value,
            )
        }
    };

    match img
        .resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
        .save(&Path::new(&image_cache_full_path))
    {
        Ok(_) => return Ok(image_cache_full_path.to_string_lossy().to_string()),
        Err(e) => return Err(e.to_string()),
    };
}
