import { takeShot, calculateScore } from "../game/shoot.js";
import { state } from "../core/state.js";
import { navigate } from "../core/router.js";

export function loadShooting() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <h1>🎯 Tiro</h1>

    <canvas id="c" width="300" height="300"></canvas>

    <button id="shoot">Disparar</button>
    <button id="back">← Volver</button>

    <p id="score"></p>
  `;

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  drawTarget(ctx);

  document.getElementById("shoot").onclick = () => {
    const shot = takeShot(state);
    const score = calculateScore(shot.x, shot.y);

    drawShot(ctx, shot.x, shot.y);

    state.game.score += score;

    document.getElementById("score").innerText = "Score: " + score;
  };

  document.getElementById("back").onclick = () => navigate("platform");
}

function drawTarget(ctx) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 300, 300);
}

function drawShot(ctx, x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(150 + x, 150 + y, 4, 0, Math.PI * 2);
  ctx.fill();
}
