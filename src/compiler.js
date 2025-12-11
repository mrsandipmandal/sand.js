export function mount(root = document.body){
  if (window.Sand && window.Sand.mount) return window.Sand.mount(root);
  console.warn('Include dist/sand.min.js for runtime');
}
