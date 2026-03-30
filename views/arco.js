import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadArco() {
  const app = document.getElementById("app");

  app.innerHTML = `
    
    <div class="header">
      <div class="hicon">GT</div>
      <div>
        <div class="htitle">MI ARCO</div>
        <div class="hsub">CONFIGURACIÓN</div>
      </div>
    </div>

    <div class="bow-profile">
      <div class="bow-header">
        
        <div class="bow-identity">
          <div class="bow-badge">ACTIVO</div>
          <div class="bow-name">${state.bow.name}</div>
          <div class="bow-model">Modelo Base</div>
        </div>

        <div class="bow-level-box">
          <div class="bow-level-label">LEVEL</div>
          <div class="bow-level-num">${state.bow.level}</div>
          <div class="bow-level-max">MAX 50</div>
        </div>

      </div>

      <div class="bow-xp-bar-wrap">
        <div class="bow-xp-bar" style="width:${state.bow.level * 2}%"></div>
      </div>

      <div class="stats-grid">

        ${stat("FPS", state.bow.stats.fps, 400, "fill-fps")}
        ${stat("LET OFF", state.bow.stats.letOff, 100, "fill-let")}
        ${stat("BRACE", state.bow.stats.braceHeight, 10, "fill-bh")}

      </div>

    </div>

    <div class="upgrade-panel">

      <div class="upgrade-header">
        <div class="upgrade-title">UPGRADES</div>

        <div class="points-badge">
          <div class="points-label">POINTS</div>
          <div class="points-num">${state.bow.points}</div>
        </div>
      </div>

      <div class="upgrade-grid">

        ${upgradeBtn("FPS", "up-fps")}
        ${upgradeBtn("LET", "up-let")}
        ${upgradeBtn("BRACE", "up-brace")}

      </div>

    </div>

    <button id="back">← Volver</button>

  `;

  // EVENTOS

  document.getElementById("up-fps").onclick = () => upgrade("fps", 5);
  document.getElementById("up-let").onclick = () => upgrade("letOff", 2);
  document.getElementById("up-brace").onclick = () => upgrade("braceHeight", 1);

  document.getElementById("back").onclick = () => navigate("platform");
}

function stat(label, value, max, className) {
  const percent = (value / max) * 100;

  return `
    <div class="stat-item">
      <div class="stat-label">${label}</div>

      <div class="stat-row-inner">
        <div class="stat-track">
          <div class="stat-fill ${className}" style="width:${percent}%"></div>
        </div>

        <div class="stat-val">${value}</div>
      </div>
    </div>
  `;
}

function upgrade(type, amount) {
  if (state.bow.points <= 0) return;

  state.bow.stats[type] += amount;
  state.bow.points -= 1;

  loadArco();
}

function upgradeBtn(label, id) {
  return `
    <div class="upgrade-btn" id="${id}">
      <div class="upgrade-btn-stat">${label}</div>
      <div class="upgrade-btn-cost">+1</div>
    </div>
  `;
}
