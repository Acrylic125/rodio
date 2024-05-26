// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod events;

use events::EventType;
use serde::{Deserialize, Serialize};
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

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
        .invoke_handler(tauri::generate_handler![
            commands::is_image::is_image,
            commands::shrink_image::shrink_image,
            commands::image_stat::image_stat
        ])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
