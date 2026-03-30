import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadPlatform() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <h1>GOAT TEAM</h1>

    <p>Nivel: ${state.bow.level}</p>
    <p>FPS: ${state.bow.stats.fps}</p>

    <button id="arco">Mi arco</button>
    <button id="shoot">Tirar</button>
    <button id="leader">Leaderboard</button>
  `;

  document.getElementById("arco").onclick = () => navigate("arco");
  document.getElementById("shoot").onclick = () => navigate("shoot");
  document.getElementById("leader").onclick = () => navigate("leaderboard");
}
