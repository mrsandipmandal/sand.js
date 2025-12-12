export default function sIgnore(el) {
  try { return el && el.hasAttribute && (el.hasAttribute("s-ignore") || el.hasAttribute("x-ignore")); } catch (e) { return false; }
}
