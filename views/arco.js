import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadArco() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="
      background:#0e0e0e;
      color:#f0ece0;
      min-height:100vh;
      font-family:sans-serif;
      padding:20px;
    ">

      <h1>${state.bow.name}</h1>

      <div style="
        background:#181818;
        border-radius:12px;
        padding:16px;
        margin-bottom:20px;
      ">
        <p><strong>Nivel:</strong> <span id="level">${state.bow.level}</span></p>
      </div>

      <div style="
        background:#181818;
        border-radius:12px;
        padding:16px;
      ">
        <h3>Stats</h3>

        <p>FPS: <span id="fps">${state.bow.stats.fps}</span></p>
        <p>Let Off: <span id="let">${state.bow.stats.letOff}</span></p>
        <p>Brace: <span id="brace">${state.bow.stats.braceHeight}</span></p>

        <button id="up-fps">+ FPS</button>
        <button id="up-let">+ Let Off</button>
      </div>

      <br>
      <button id="back">← Volver</button>

    </div>
  `;

  document.getElementById("up-fps").onclick = () => {
    state.bow.stats.fps += 5;
    updateUI();
  };

  document.getElementById("up-let").onclick = () => {
    state.bow.stats.letOff += 2;
    updateUI();
  };

  document.getElementById("back").onclick = () => navigate("platform");
}

function updateUI() {
  document.getElementById("fps").innerText = state.bow.stats.fps;
  document.getElementById("let").innerText = state.bow.stats.letOff;
}
