export default function sTeleport(el) {
  const target = el.getAttribute("s-teleport");
  const container = document.querySelector(target);

  if (container && !el._teleported) {
    el._placeholder = el._placeholder || document.createComment("s-teleport");
    el.parentNode.insertBefore(el._placeholder, el);
    container.appendChild(el);
    el._teleported = true;
  }
}
