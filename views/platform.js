import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadPlatform() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="header">
      <div class="hicon">GT</div>
      <div>
        <div class="htitle">GOAT TEAM</div>
        <div class="hsub">Plataforma</div>
      </div>
    </div>

    <div class="bow-profile">
      <div class="bow-header">
        <div>
          <div class="bow-badge">ACTIVO</div>
          <div class="bow-name">${state.bow.name}</div>
          <div class="bow-model">Modelo Base</div>
        </div>

        <div class="bow-level-box">
          <div class="bow-level-num">${state.bow.level}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:20px;">
      <button id="arco">MI ARCO</button>
      <button id="shoot">TIRAR</button>
    </div>
  `;

  document.getElementById("arco").onclick = () => navigate("arco");
  document.getElementById("shoot").onclick = () => navigate("shoot");
}
