import { safeEval } from "../utils.js";
export default function sFor(el, ctx) {
  // only handle <template s-for="item in list"> usage
  if (el.tagName !== "TEMPLATE") return;
  const exp = el.getAttribute("s-for") ?? el.getAttribute("x-for");
  if (!exp) return;

  const match = exp.match(/^\s*(?:\(([^)]+)\)|([^ ]+))\s+in\s+(.+)$/);
  if (!match) return;
  const itemName = (match[1] || match[2]).split(',')[0].trim();
  const listExpr = match[3].trim();
  const parent = el.parentNode;
  if (!parent) return;

  // marker & cleanup
  if (!el._marker) { el._marker = document.createComment("s-for"); parent.insertBefore(el._marker, el); }
  if (!el._prev) el._prev = [];

  // evaluate list
  let list = [];
  try { list = safeEval(listExpr, ctx) || []; } catch (e) { list = []; }

  // remove previous nodes
  (el._prev || []).forEach(n => n.parentNode && n.parentNode.removeChild(n));
  el._prev = [];

  // render each item
  list.forEach((item, idx) => {
    const clone = el.content.cloneNode(true);
    // attach a temporary ctx for this clone
    const childCtx = Object.create(ctx);
    childCtx[itemName] = item;
    childCtx.$index = idx;
    // insert clone before marker
    parent.insertBefore(clone, el._marker);
    // record nodes inserted between previous sibling and marker
    // simple approach: collect the last N child nodes inserted (where N is the number of top-level nodes in the clone)
    const topCount = el.content.childNodes.length;
    const inserted = [];
    let cur = el._marker.previousSibling;
    for (let k = 0; k < topCount && cur; k++) {
      inserted.push(cur);
      cur = cur.previousSibling;
    }
    inserted.reverse().forEach(n => el._prev.push(n));
    // let the main renderer pick up directives on these newly inserted nodes in the next tick
  });
}
