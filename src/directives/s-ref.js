export default function sRef(el, ctx) {
  const name = el.getAttribute("s-ref");
  if (!name || !ctx) return;
  ctx.$refs = ctx.$refs || {};
  ctx.$refs[name] = el;
}
