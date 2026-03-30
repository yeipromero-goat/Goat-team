export function takeShot(state) {
  const error = 30 / state.bow.level;

  const x = (Math.random() - 0.5) * error;
  const y = (Math.random() - 0.5) * error;

  return { x, y };
}

export function calculateScore(x, y) {
  const d = Math.sqrt(x * x + y * y);

  if (d < 5) return 10;
  if (d < 10) return 9;
  if (d < 20) return 8;
  return 7;
}
