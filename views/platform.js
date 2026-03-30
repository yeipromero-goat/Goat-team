import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadPlatform() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="font-family: sans-serif; padding:20px;">
      
      <h1>GOAT TEAM</h1>

      <p>Nivel del arco: ${state.bow.level}</p>
      <p>FPS: ${state.bow.stats.fps}</p>

      <br>

      <button id="arco">Mi arco</button>
      <button id="shoot">Entrenar tiro</button>
      <button id="leader">Leaderboard</button>

    </div>
  `;

  document.getElementById("arco").onclick = () => navigate("arco");
  document.getElementById("shoot").onclick = () => navigate("shoot");
  document.getElementById("leader").onclick = () => navigate("leaderboard");
}
