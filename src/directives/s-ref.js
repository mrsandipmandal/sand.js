export default function sRef(el, ctx) {
  const name = el.getAttribute("s-ref");
  ctx.$refs[name] = el;
}
