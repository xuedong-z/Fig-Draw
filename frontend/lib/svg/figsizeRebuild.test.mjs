// Unit tests for the pure figsize geometry math. Run: node figsizeRebuild.test.mjs
// (Mirrors the pure functions in figsizeRebuild.ts; keep them in sync.)

const round = (n) => Math.round(n * 1000) / 1000;

function remapPathD(d, fx, fy, sx, sy) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return d;
  const out = [];
  let cmd = "";
  let i = 0;
  const num = (t) => parseFloat(t);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; out.push(t); i += 1; continue; }
    const C = cmd.toUpperCase();
    const absolute = cmd === C;
    const mapX = (v) => round(absolute ? fx(num(v)) : num(v) * sx);
    const mapY = (v) => round(absolute ? fy(num(v)) : num(v) * sy);
    if (C === "M" || C === "L" || C === "T") { out.push(mapX(tokens[i]), mapY(tokens[i + 1])); i += 2; }
    else if (C === "H") { out.push(mapX(tokens[i])); i += 1; }
    else if (C === "V") { out.push(mapY(tokens[i])); i += 1; }
    else if (C === "C") { out.push(mapX(tokens[i]), mapY(tokens[i + 1]), mapX(tokens[i + 2]), mapY(tokens[i + 3]), mapX(tokens[i + 4]), mapY(tokens[i + 5])); i += 6; }
    else if (C === "S" || C === "Q") { out.push(mapX(tokens[i]), mapY(tokens[i + 1]), mapX(tokens[i + 2]), mapY(tokens[i + 3])); i += 4; }
    else if (C === "A") { out.push(round(num(tokens[i]) * sx), round(num(tokens[i + 1]) * sy), tokens[i + 2], tokens[i + 3], tokens[i + 4], mapX(tokens[i + 5]), mapY(tokens[i + 6])); i += 7; }
    else { out.push(num(tokens[i])); i += 1; }
  }
  let s = "";
  for (const tok of out) { if (typeof tok === "string") s += (s ? " " : "") + tok; else s += " " + tok; }
  return s.trim();
}

function remapPoints(points, fx, fy) {
  const nums = points.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!nums) return points;
  const pairs = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push(`${round(fx(parseFloat(nums[i])))},${round(fy(parseFloat(nums[i + 1])))}`);
  return pairs.join(" ");
}

function planFigsize(plot, vbW, vbH, newW, newH) {
  const mL = plot.x, mT = plot.y, mR = vbW - (plot.x + plot.w), mB = vbH - (plot.y + plot.h);
  const newPlot = { x: mL, y: mT, w: Math.max(10, newW - mL - mR), h: Math.max(10, newH - mT - mB) };
  const sx = newPlot.w / plot.w, sy = newPlot.h / plot.h;
  const mapX = (x) => newPlot.x + (x - plot.x) * sx;
  const mapY = (y) => newPlot.y + (y - plot.y) * sy;
  return { newPlot, mapX, mapY, sx, sy };
}

// ── test harness ──
let pass = 0, fail = 0;
const nums = (s) => (s.match(/-?\d*\.?\d+/g) || []).map(Number);
function eq(name, got, exp) {
  const a = JSON.stringify(got), b = JSON.stringify(exp);
  if (a === b) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + "\n   got " + a + "\n   exp " + b); }
}
function near(name, got, exp, tol = 0.01) {
  const ok = got.length === exp.length && got.every((g, i) => Math.abs(g - exp[i]) < tol);
  if (ok) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + "\n   got " + JSON.stringify(got) + "\n   exp " + JSON.stringify(exp)); }
}

// origin-like: plot {70,30,380,250}, viewBox 480x340
const plot = { x: 70, y: 30, w: 380, h: 250 };

// 1) identity resize -> plot unchanged, maps are identity
{
  const p = planFigsize(plot, 480, 340, 480, 340);
  eq("identity newPlot", p.newPlot, plot);
  near("identity sx/sy", [p.sx, p.sy], [1, 1]);
  near("identity mapX edges", [p.mapX(70), p.mapX(450)], [70, 450]);
}

// 2) widen panel to 960: margins (L=70, R=30) fixed, plot fills the rest
{
  const p = planFigsize(plot, 480, 340, 960, 340);
  eq("widen newPlot", p.newPlot, { x: 70, y: 30, w: 960 - 70 - 30, h: 250 });
  near("widen plot-left stays", [p.mapX(70)], [70]);
  near("widen plot-right -> newW-mR", [p.mapX(450)], [960 - 30]);
  near("widen y unchanged", [p.mapY(30), p.mapY(280)], [30, 280]);
}

// 3) path remap: identity
near("path identity", nums(remapPathD("M60 30 L420 250 L420 30", (x) => x, (y) => y, 1, 1)), [60, 30, 420, 250, 420, 30]);

// 4) path remap: X doubled, Y same (absolute M/L)
near("path scale-x", nums(remapPathD("M60 30 L420 250", (x) => x * 2, (y) => y, 2, 1)), [120, 30, 840, 250]);

// 5) path remap through a real plan (widen): a frame corner at plot edges maps to new edges
{
  const p = planFigsize(plot, 480, 340, 960, 340);
  near("frame remap", nums(remapPathD("M70 30 L450 30 L450 280 L70 280", p.mapX, p.mapY, p.sx, p.sy)),
    [70, 30, 930, 30, 930, 280, 70, 280]);
}

// 6) polyline points remap
near("points remap", nums(remapPoints("60,200 120,170 180,150", (x) => x + 10, (y) => y)), [70, 200, 130, 170, 190, 150]);

// 7) cubic bezier (C) keeps pair structure
near("cubic remap", nums(remapPathD("M10 10 C20 20 30 30 40 40", (x) => x * 2, (y) => y * 3, 2, 3)),
  [20, 30, 40, 60, 60, 90, 80, 120]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
