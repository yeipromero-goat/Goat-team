export function loadShooting() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="background:#0e0e0e; color:white; min-height:100vh; padding:20px;">
      <h1>🎯 Tiro</h1>

      <canvas id="c" width="300" height="300" style="background:white;"></canvas>

      <br><br>
      <button id="shoot">Disparar</button>
      <button id="back">← Volver</button>

      <p id="score"></p>
    </div>
  `;

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  document.getElementById("shoot").onclick = () => {
    const x = (Math.random() - 0.5) * 50;
    const y = (Math.random() - 0.5) * 50;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(150 + x, 150 + y, 4, 0, Math.PI * 2);
    ctx.fill();

    document.getElementById("score").innerText = "Tiro realizado";
  };

  document.getElementById("back").onclick = () => navigate("platform");
}
