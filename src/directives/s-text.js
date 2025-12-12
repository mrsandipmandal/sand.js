import { safeEval } from "../utils.js";
export default function sText(el, ctx) {
  const exp = el.getAttribute("s-text") ?? el.getAttribute("x-text");
  if (exp == null) return;
  el.textContent = safeEval(exp, ctx) ?? "";
}
