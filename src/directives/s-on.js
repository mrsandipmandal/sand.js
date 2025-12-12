import { safeEval } from "../utils.js";
export default function sOn(el, ctx, attrName) {
  if (!attrName) return;
  let event;
  if (attrName.startsWith("@")) event = attrName.slice(1);
  else if (attrName.startsWith("s-on:") || attrName.startsWith("x-on:")) event = attrName.slice(5);
  else return;
  const code = el.getAttribute(attrName);
  if (!code) return;
  const mark = `_s_on_${event}`;
  if (el[mark]) return;
  el.addEventListener(event, e => {
    try { safeEval(code, Object.assign(Object.create(ctx), { $event: e })); } catch (err) { console.warn('[sandi-js] s-on handler error', err); }
  });
  el[mark] = true;
}
