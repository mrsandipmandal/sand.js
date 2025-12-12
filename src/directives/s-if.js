// src/directives/s-if.js
import { safeEval } from "../utils.js";

export default function sIf(el, ctx) {
  if (!el._s_if_placeholder) {
    el._s_if_placeholder = document.createComment("s-if");
  }

  let value;
  try {
    value = safeEval(el.getAttribute("s-if"), ctx);
  } catch (err) {
    value = false;
  }

  // If expression true -> ensure element is in DOM (replace placeholder if present)
  if (value) {
    const ph = el._s_if_placeholder;
    if (ph && ph.parentNode && !el.isConnected) {
      ph.parentNode.replaceChild(el, ph);
    }
    // If neither placeholder nor element is in DOM, do nothing (likely initial)
  } else {
    // hide element: replace with placeholder if element currently attached
    if (el.isConnected) {
      const ph = el._s_if_placeholder;
      el.parentNode && el.parentNode.replaceChild(ph, el);
    } else {
      // If element not connected and placeholder not in DOM, insert placeholder where element would be
      if (!el._s_if_placeholder.parentNode && el.parentNode) {
        el.parentNode.insertBefore(el._s_if_placeholder, el);
      }
    }
  }
}
