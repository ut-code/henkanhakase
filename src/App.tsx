import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="m-0 flex min-h-screen flex-col items-center justify-start pt-[10vh] text-center">
      <h1 className="mb-8 text-4xl font-bold">
        Welcome to Tauri + React
      </h1>

      <div className="mb-6 flex justify-center">
        <a href="https://vite.dev" target="_blank">
          <img
            src="/vite.svg"
            alt="Vite logo"
            className="h-24 p-6 transition duration-700 hover:drop-shadow-[0_0_2em_#747bff]"
          />
        </a>

        <a href="https://tauri.app" target="_blank">
          <img
            src="/tauri.svg"
            alt="Tauri logo"
            className="h-24 p-6 transition duration-700 hover:drop-shadow-[0_0_2em_#24c8db]"
          />
        </a>

        <a href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            alt="React logo"
            className="h-24 p-6 transition duration-700 hover:drop-shadow-[0_0_2em_#61dafb]"
          />
        </a>
      </div>

      <p className="mb-6">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="mb-4 flex justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          className="mr-2 rounded-lg border border-transparent bg-white px-5 py-2 text-black shadow-md outline-none transition focus:border-blue-500 dark:bg-zinc-900 dark:text-white"
          placeholder="Enter a name..."
          onChange={(e) => setName(e.currentTarget.value)}
        />

        <button
          type="submit"
          className="cursor-pointer rounded-lg border border-transparent bg-white px-5 py-2 font-medium text-black shadow-md transition hover:border-blue-500 active:border-blue-500 active:bg-gray-200 dark:bg-zinc-900 dark:text-white dark:active:bg-zinc-800"
        >
          Greet
        </button>
      </form>

      <p>{greetMsg}</p>
    </main>
  );
}

export default App;