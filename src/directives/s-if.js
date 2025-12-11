import { safeEval } from "../utils.js";

export default function sIf(el, ctx) {
  if (!el._placeholder) {
    el._placeholder = document.createComment("s-if");
  }

  const show = safeEval(el.getAttribute("s-if"), ctx);

  if (show) {
    if (!el.isConnected && el._placeholder.parentNode) {
      el._placeholder.parentNode.replaceChild(el, el._placeholder);
    }
  } else {
    if (el.isConnected) {
      el.parentNode.replaceChild(el._placeholder, el);
    }
  }
}
