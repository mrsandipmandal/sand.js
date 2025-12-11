import { safeEval } from "../utils.js";

export default function sHtml(el, ctx) {
  const exp = el.getAttribute("s-html");
  el.innerHTML = safeEval(exp, ctx) ?? "";
}
