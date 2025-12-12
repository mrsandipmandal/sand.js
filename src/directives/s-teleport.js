// src/directives/s-teleport.js
export default function sTeleport(el) {
  const targetSel = el.getAttribute("s-teleport");
  if (!targetSel) return;

  // create placeholder if not exist
  if (!el._s_teleport_placeholder) el._s_teleport_placeholder = document.createComment("s-teleport");

  // find target
  const target = document.querySelector(targetSel);
  if (!target) return; // silently fail until target exists in DOM

  // if not already teleported, move
  if (!el._s_teleported) {
    if (el.parentNode && !el._s_teleport_placeholder.parentNode) {
      el.parentNode.insertBefore(el._s_teleport_placeholder, el);
    }
    target.appendChild(el);
    el._s_teleported = true;
  }
}
