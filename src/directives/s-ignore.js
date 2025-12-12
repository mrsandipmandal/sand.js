// src/directives/s-ignore.js
export default function sIgnore(el) {
  try { return el && el.hasAttribute && el.hasAttribute("s-ignore"); } catch (e) { return false; }
}
