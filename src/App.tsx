import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

function App() {

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <main className="bg-gray-950 w-screen h-svh text-white">
      <h1>Hello world!</h1>
    </main>
  );
}

export default App;
