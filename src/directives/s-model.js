import { getPath, setPath } from "../utils.js";
export default function sModel(el, ctx) {
  const key = el.getAttribute("s-model") ?? el.getAttribute("x-model");
  if (!key) return;
  const current = getPath(ctx, key);
  if (current !== undefined && el.value !== String(current)) el.value = current;
  if (!el._s_model_bound) {
    el.addEventListener("input", () => {
      try { setPath(ctx, key, el.value); } catch (err) { console.warn('[sandi-js] s-model set error', err); }
    });
    el._s_model_bound = true;
  }
}
