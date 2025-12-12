// src/directives/s-bind.js
import { safeEval } from "../utils.js";

export default function sBind(el, ctx) {
  const raw = el.getAttribute("s-bind");
  if (!raw) return;
  const items = raw.split(",").map(str => str.trim()).filter(Boolean);

  items.forEach(pair => {
    const parts = pair.split(":");
    if (parts.length < 2) return;
    const prop = parts.shift().trim();
    const exp = parts.join(":").trim();
    const val = safeEval(exp, ctx);
    try { el[prop] = val; } catch { el.setAttribute(prop, val); }
  });
}
