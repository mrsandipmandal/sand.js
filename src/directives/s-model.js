import { safeEval } from "../utils.js";

export default function sModel(el, ctx) {
  const key = el.getAttribute("s-model");
  if (!key) return;

  el.value = safeEval(key, ctx) ?? "";

  if (!el._s_model_bound) {
    el.addEventListener("input", () => {
      ctx[key] = el.value;
    });
    el._s_model_bound = true;
  }
}
