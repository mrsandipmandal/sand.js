import { safeEval } from "../utils.js";
export default function sBind(el, ctx) {
  const raw = el.getAttribute("s-bind") ?? el.getAttribute("x-bind");
  if (!raw) return;
  raw.split(",").map(r => r.trim()).filter(Boolean).forEach(pair => {
    const parts = pair.split(":");
    if (parts.length < 2) return;
    const prop = parts.shift().trim();
    const expr = parts.join(":").trim();
    const val = safeEval(expr, ctx);
    try { el[prop] = val; } catch { el.setAttribute(prop, val); }
  });
}
