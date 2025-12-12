// src/directives/s-model.js
import { safeEval, setPath, getPath } from "../utils.js";

export default function sModel(el, ctx) {
  const key = el.getAttribute("s-model");
  if (!key) return;

  // set initial DOM value from ctx
  try {
    const initial = getPath(ctx, key);
    if (initial !== undefined && el.value !== String(initial)) el.value = initial;
  } catch (e) { /* ignore */ }

  if (!el._s_model_bound) {
    el.addEventListener("input", () => {
      try {
        setPath(ctx, key, el.value);
      } catch (err) { console.warn('[sandi-js] s-model set error', err); }
    });
    el._s_model_bound = true;
  }
}
