// src/directives/s-effect.js
import { safeEval } from "../utils.js";

export default function sEffect(el, ctx) {
  const expr = el.getAttribute("s-effect");
  if (!expr) return;
  if (!ctx || typeof ctx.__effect !== "function") return;
  if (el._s_effect_registered) return;
  ctx.__effect(() => {
    try { safeEval(expr, ctx); } catch (e) { console.warn('[sandi-js] s-effect error', e); }
  });
  el._s_effect_registered = true;
}
