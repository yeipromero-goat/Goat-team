import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadArco() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <h1>${state.bow.name}</h1>

    <p>Nivel: ${state.bow.level}</p>
    <p>FPS: <span id="fps">${state.bow.stats.fps}</span></p>

    <button id="upgrade">+ FPS</button>
    <button id="back">← Volver</button>
  `;

  document.getElementById("upgrade").onclick = () => {
    state.bow.stats.fps += 5;
    document.getElementById("fps").innerText = state.bow.stats.fps;
  };

  document.getElementById("back").onclick = () => navigate("platform");
}
