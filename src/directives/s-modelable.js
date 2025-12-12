export default function sModelable(el, ctx) {
  const pk = el.getAttribute("s-modelable") ?? el.getAttribute("x-modelable");
  if (!pk) return;
  ctx.$modelable = ctx.$modelable || {};
  ctx.$modelable[pk] = ctx.$modelable[pk] || [];
  ctx.$modelable[pk].push(el);
}
