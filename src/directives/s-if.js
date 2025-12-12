import { safeEval } from "../utils.js";
export default function sIf(el, ctx) {
  const exp = el.getAttribute("s-if") ?? el.getAttribute("x-if");
  if (!el._s_if_placeholder) el._s_if_placeholder = document.createComment("s-if");
  let show = false;
  try { show = safeEval(exp, ctx); } catch (e) { show = false; }
  if (show) {
    const ph = el._s_if_placeholder;
    if (ph && ph.parentNode && !el.isConnected) ph.parentNode.replaceChild(el, ph);
  } else {
    if (el.isConnected) {
      const ph = el._s_if_placeholder;
      el.parentNode && el.parentNode.replaceChild(ph, el);
    } else if (!el._s_if_placeholder.parentNode && el.parentNode) {
      el.parentNode.insertBefore(el._s_if_placeholder, el);
    }
  }
}
