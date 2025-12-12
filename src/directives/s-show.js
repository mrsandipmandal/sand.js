import { safeEval } from "../utils.js";
export default function sShow(el, ctx) {
  const exp = el.getAttribute("s-show");
  const v = safeEval(exp, ctx);
  el.style.display = v ? "" : "none";
}
