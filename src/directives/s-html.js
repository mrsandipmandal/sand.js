import { safeEval } from "../utils.js";
export default function sHtml(el, ctx) {
  const exp = el.getAttribute("s-html");
  const v = safeEval(exp, ctx);
  el.innerHTML = v == null ? "" : v;
}
