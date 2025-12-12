export default function sCloak(el) {
  if (el && el.hasAttribute && el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
  if (el && el.hasAttribute && el.hasAttribute("x-cloak")) el.removeAttribute("x-cloak");
}
