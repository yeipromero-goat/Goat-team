import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadPlatform() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="
      background:#0e0e0e;
      color:#f0ece0;
      min-height:100vh;
      font-family: sans-serif;
      padding:20px;
    ">

      <h1 style="letter-spacing:2px;">GOAT TEAM</h1>

      <div style="
        background:#181818;
        padding:16px;
        border-radius:12px;
        margin-top:20px;
      ">
        <p><strong>Nivel:</strong> ${state.bow.level}</p>
        <p><strong>FPS:</strong> ${state.bow.stats.fps}</p>
      </div>

      <div style="margin-top:20px;">
        <button id="arco">Mi arco</button>
        <button id="shoot">Tirar</button>
        <button id="leader">Leaderboard</button>
      </div>

    </div>
  `;

  document.getElementById("arco").onclick = () => navigate("arco");
  document.getElementById("shoot").onclick = () => navigate("shoot");
  document.getElementById("leader").onclick = () => navigate("leaderboard");
}
