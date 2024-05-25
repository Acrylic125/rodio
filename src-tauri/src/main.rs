// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod events;

use events::EventType;
use image::io::Reader as ImageReader;
use mime_guess::from_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

#[tauri::command]
fn is_image(file_path: String) -> bool {
    if Path::new(&file_path).exists() {
        let mime_type = from_path(&file_path).first_or_octet_stream();
        mime_type.type_() == "image"
    } else {
        false
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ImageStat {
    width: u32,
    height: u32,
    size: u64,
}

#[tauri::command]
fn image_stat(file_path: String) -> Result<ImageStat, String> {
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

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Payload {
    message: String,
}

fn main() {
    let rodio_menu = Submenu::new(
        "Rodio",
        Menu::new()
            .add_item(CustomMenuItem::new("home".to_string(), "Home"))
            .add_item(CustomMenuItem::new("quit".to_string(), "Quit")),
    );

    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::SelectAll),
    );

    let menu = Menu::new()
        .add_native_item(MenuItem::Copy)
        .add_item(CustomMenuItem::new("hide", "Hide"))
        .add_submenu(rodio_menu)
        .add_submenu(edit_menu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
            "quit" => {
                std::process::exit(0);
            }
            "home" => {
                // let name = EventType::Goto(payload);
                let goto = events::GotoEvent {
                    goto: "/".to_string(),
                };
                event.window().emit(goto.name(), &goto).unwrap();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![is_image, image_stat])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
