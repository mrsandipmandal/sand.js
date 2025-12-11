import { safeEval } from "../utils.js";

export default function sEffect(el, ctx) {
  const exp = el.getAttribute("s-effect");
  if (!el._s_effect) {
    ctx.__effect(() => safeEval(exp, ctx));
    el._s_effect = true;
  }
}
