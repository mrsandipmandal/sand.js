import { safeEval } from "../utils.js";

export default function sShow(el, ctx) {
  const exp = el.getAttribute("s-show");
  const value = safeEval(exp, ctx);
  el.style.display = value ? "" : "none";
}
