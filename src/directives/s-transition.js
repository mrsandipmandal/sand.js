export default function sTransition(el) {
  const style = el.getAttribute("s-transition") || "all 150ms ease";
  el.style.transition = style;
}
