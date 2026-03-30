import { loadPlatform } from "../views/platform.js";
import { loadArco } from "../views/arco.js";
import { loadShooting } from "../views/shooting.js";
import { loadLeaderboard } from "../views/leaderboard.js";

export function navigate(view) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (view === "platform") loadPlatform();
  if (view === "arco") loadArco();
  if (view === "shoot") loadShooting();
  if (view === "leaderboard") loadLeaderboard();
}
