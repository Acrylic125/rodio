// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod events;

use events::EventType;
use serde::{Deserialize, Serialize};
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn hello_world() -> String {
    format!("Hello, You've been greeted from Rust!")
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Payload {
    message: String,
}

fn main() {
    let home = CustomMenuItem::new("home".to_string(), "Home");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let submenu = Submenu::new("Rodio", Menu::new().add_item(home).add_item(quit));
    let menu = Menu::new()
        .add_native_item(MenuItem::Copy)
        .add_item(CustomMenuItem::new("hide", "Hide"))
        .add_submenu(submenu);

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
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![hello_world])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
