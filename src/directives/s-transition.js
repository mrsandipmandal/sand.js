export default function sTransition(el) {
  const val = el.getAttribute("s-transition") ?? el.getAttribute("x-transition") ?? "all 150ms ease";
  el.style.transition = val;
}
