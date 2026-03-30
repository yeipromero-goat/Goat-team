import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadLeaderboard() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <h1>🏆 Leaderboard (local)</h1>

    <p>Tu score: ${state.game.score}</p>

    <button id="back">← Volver</button>
  `;

  document.getElementById("back").onclick = () => navigate("platform");
}
