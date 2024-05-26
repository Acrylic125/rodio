#[path = "../utils/mod.rs"]
mod utils;

use std::path::Path;
use utils::image_utils::{fix_orientation, get_orientation};

use image::{DynamicImage, GenericImageView};

use self::utils::image_utils::NoFixNeededReason;

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

    let parent = cache_dir.join(IMAGES_CACHE_DIR);
    let image_cache_full_path = parent.join(&file_name_with_prefix);
    if image_cache_full_path.exists() {
        return Ok(image_cache_full_path.to_string_lossy().to_string());
    }
    // Create directory if it doesn't exist
    if !parent.exists() {
        match std::fs::create_dir_all(parent) {
            Ok(_) => (),
            Err(e) => return Err(e.to_string()),
        }
    }

    let img_buf = match std::fs::read(&file_path) {
        Ok(img_buf) => img_buf,
        Err(e) => return Err(e.to_string()),
    };
    let mut dyn_img = match image::load_from_memory(&img_buf) {
        Ok(img) => img,
        Err(e) => return Err(e.to_string()),
    };
    let orientation = match get_orientation(&img_buf) {
        Ok(orientation) => orientation,
        Err(NoFixNeededReason::AleadyCorrect) => 1,
        Err(NoFixNeededReason::NoExif) => 1,
        Err(err) => return Err(format!("Failed to get orientation: {:?}", err).to_string()),
    };

    let (img_width, img_height) = dyn_img.dimensions();
    let (new_width, new_height) = if img_width > img_height {
        if img_width <= desired_threshold.desired_value {
            return Ok(file_path);
        } else {
            (
                desired_threshold.desired_value,
                (desired_threshold.desired_value as f32 / width as f32 * height as f32) as u32,
            )
        }
    } else {
        if img_height <= desired_threshold.desired_value {
            return Ok(file_path);
        } else {
            (
                (desired_threshold.desired_value as f32 / height as f32 * width as f32) as u32,
                desired_threshold.desired_value,
            )
        }
    };

    dyn_img = dyn_img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);
    let mut img = dyn_img.to_rgb8();
    img = fix_orientation(img, orientation);

    match img.save(&Path::new(&image_cache_full_path)) {
        Ok(_) => return Ok(image_cache_full_path.to_string_lossy().to_string()),
        Err(e) => {
            println!("Error: {}", e.to_string());
            return Err(e.to_string());
        }
    };
}