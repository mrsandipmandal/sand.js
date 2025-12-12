export default function sRef(el, ctx) {
  const name = el.getAttribute("s-ref") ?? el.getAttribute("x-ref");
  if (!name || !ctx) return;
  ctx.$refs = ctx.$refs || {};
  ctx.$refs[name] = el;
}
