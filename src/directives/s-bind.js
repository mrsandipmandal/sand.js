import { safeEval } from "../utils.js";

export default function sBind(el, ctx) {
  const raw = el.getAttribute("s-bind");
  const items = raw.split(",").map(str => str.trim());

  items.forEach(pair => {
    const [prop, exp] = pair.split(":").map(s => s.trim());
    const val = safeEval(exp, ctx);

    try { el[prop] = val; }
    catch { el.setAttribute(prop, val); }
  });
}
