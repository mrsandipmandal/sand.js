import { safeEval } from "../utils.js";
export default function sInit(el, ctx) {
  const exp = el.getAttribute("s-init") ?? el.getAttribute("x-init");
  if (!exp) return;
  if (el._s_inited) return;
  el._s_inited = true;
  safeEval(exp, ctx);
}
