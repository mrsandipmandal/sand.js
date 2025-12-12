export default function sCloak(el) {
  if (el && el.hasAttribute && el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
}
