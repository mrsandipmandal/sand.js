import { safeEval } from "../utils.js";
export default function sShow(el, ctx) {
  const exp = el.getAttribute("s-show") ?? el.getAttribute("x-show");
  if (exp == null) return;
  const v = safeEval(exp, ctx);
  el.style.display = v ? "" : "none";
}
