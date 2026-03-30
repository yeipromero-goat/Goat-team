import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadArco() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="font-family: sans-serif; padding:20px;">
      
      <h1>${state.bow.name}</h1>

      <p><strong>Nivel:</strong> <span id="level">${state.bow.level}</span></p>

      <h2>Stats</h2>

      <p>FPS: <span id="fps">${state.bow.stats.fps}</span></p>
      <p>Let Off: <span id="let">${state.bow.stats.letOff}</span></p>
      <p>Brace Height: <span id="brace">${state.bow.stats.braceHeight}</span></p>

      <h2>Upgrades</h2>

      <button id="up-fps">+ FPS</button>
      <button id="up-let">+ Let Off</button>

      <br><br>

      <button id="back">← Volver</button>

    </div>
  `;

  // EVENTOS

  document.getElementById("up-fps").onclick = () => {
    state.bow.stats.fps += 5;
    updateUI();
  };

  document.getElementById("up-let").onclick = () => {
    state.bow.stats.letOff += 2;
    updateUI();
  };

  document.getElementById("back").onclick = () => {
    navigate("platform");
  };
}

// actualizar UI sin recargar
function updateUI() {
  document.getElementById("fps").innerText = state.bow.stats.fps;
  document.getElementById("let").innerText = state.bow.stats.letOff;
}
