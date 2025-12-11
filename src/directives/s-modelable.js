export default function sModelable(el, ctx) {
  const key = el.getAttribute("s-modelable");
  if (!key) return;

  ctx.$modelable[key] = el;
}
