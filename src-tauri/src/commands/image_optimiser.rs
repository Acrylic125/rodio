#[path = "../utils/mod.rs"]
mod utils;

use base64::{engine::general_purpose, Engine};
use std::path::Path;
use utils::image_utils::{fix_orientation_rgba, get_orientation};

use image::{ColorType, DynamicImage, GenericImageView};
use sha2::{Digest, Sha256};

use self::utils::image_utils::{fix_orientation_rgb, NoFixNeededReason};

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
    file_path: String,
    width: u32,
    height: u32,
    cache_dir: String,
) -> Result<String, String> {
    let high = width.max(height);
    let desired_threshold = match high {
        high if high <= ImageResizeThreshold::VerySmall.value().desired_value => {
            ImageResizeThreshold::VerySmall
        }
        high if high <= ImageResizeThreshold::Small.value().desired_value => {
            ImageResizeThreshold::Small
        }
        high if high <= ImageResizeThreshold::Medium.value().desired_value => {
            ImageResizeThreshold::Medium
        }
        high if high <= ImageResizeThreshold::Large.value().desired_value => {
            ImageResizeThreshold::Large
        }
        _ => ImageResizeThreshold::VeryLarge,
    }
    .value();

    let file_extension = match Path::new(&file_path).extension() {
        Some(ext) => ext.to_string_lossy(),
        None => {
            return Err("Failed to get file extension".to_string());
        }
    };
    let img_buf = match std::fs::read(&file_path) {
        Ok(img_buf) => img_buf,
        Err(e) => {
            return Err(e.to_string());
        }
    };
    let mut hasher = Sha256::new();
    hasher.update(&img_buf);
    let hash = hasher.finalize();

    let file_name_with_prefix = format!(
        "{}_{}.{}",
        desired_threshold.prefix,
        general_purpose::URL_SAFE.encode(&hash),
        file_extension
    );
    let cache_dir_as_path = Path::new(&cache_dir);
    let parent = cache_dir_as_path.join(IMAGES_CACHE_DIR);
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

    let mut dyn_img = match image::load_from_memory(&img_buf) {
        Ok(img) => img,
        Err(e) => return Err(e.to_string()),
    };

    let orientation = match get_orientation(&img_buf) {
        Ok(orientation) => orientation,
        Err(NoFixNeededReason::AleadyCorrect) => 1,
        Err(NoFixNeededReason::NoExif) => 1,
        Err(NoFixNeededReason::NoOrientationTag) => 1,
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

    let dyn_img_color_type = match get_support_image_color_type(&dyn_img) {
        Some(color_type) => color_type,
        None => return Err("Unsupported image color type".to_string()),
    };
    dyn_img = dyn_img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

    match dyn_img_color_type {
        SupportedImageColorType::Rgba => {
            let mut img = dyn_img.into_rgba8();
            if orientation > 1 {
                img = fix_orientation_rgba(img, orientation);
            }

            match img.save(&Path::new(&image_cache_full_path)) {
                Ok(_) => return Ok(image_cache_full_path.to_string_lossy().to_string()),
                Err(e) => {
                    println!(
                        "Error {}: {}",
                        image_cache_full_path.to_string_lossy(),
                        e.to_string()
                    );
                    return Err(e.to_string());
                }
            };
        }
        SupportedImageColorType::Rgb => {
            let mut img = dyn_img.into_rgb8();
            if orientation > 1 {
                img = fix_orientation_rgb(img, orientation);
            }

            match img.save(&Path::new(&image_cache_full_path)) {
                Ok(_) => return Ok(image_cache_full_path.to_string_lossy().to_string()),
                Err(e) => {
                    println!(
                        "Error {}: {}",
                        image_cache_full_path.to_string_lossy(),
                        e.to_string()
                    );
                    return Err(e.to_string());
                }
            };
        }
    };
}

enum SupportedImageColorType {
    Rgb,
    Rgba,
}

fn get_support_image_color_type(image: &DynamicImage) -> Option<SupportedImageColorType> {
    match image.color() {
        ColorType::Rgba8 | ColorType::Rgba16 | ColorType::Rgba32F => {
            Some(SupportedImageColorType::Rgba)
        }
        ColorType::Rgb8 | ColorType::Rgb16 | ColorType::Rgb32F => {
            Some(SupportedImageColorType::Rgb)
        }
        _ => None,
    }
}
