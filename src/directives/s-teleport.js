export default function sTeleport(el) {
  const sel = el.getAttribute("s-teleport") ?? el.getAttribute("x-teleport");
  if (!sel) return;
  if (!el._ph) el._ph = document.createComment("s-teleport");
  const target = document.querySelector(sel);
  if (!target) return;
  if (!el._teleported) {
    el.parentNode && el.parentNode.insertBefore(el._ph, el);
    target.appendChild(el);
    el._teleported = true;
  }
}
