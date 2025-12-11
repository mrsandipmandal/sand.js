import { safeEval } from "./utils.js";
import { createReactive } from "./reactivity.js";

export function mount(root = document.body) {
  const components = root.querySelectorAll("[s-data]");

  components.forEach(el => {
    const exp = el.getAttribute("s-data");
    const initial = safeEval(exp, {}) || {};
    const state = createReactive(initial);

    const ctx = state.proxy;

    state.effect(() => refresh(el, ctx));
  });
}

function refresh(el, ctx) {
  walk(el, (node) => {
    if (node.hasAttribute?.("s-bind")) {
      const raw = node.getAttribute("s-bind");
      const [prop, exp] = raw.split(":").map(s => s.trim());
      node[prop] = safeEval(exp, ctx);
    }

    if (node.hasAttribute?.("@click")) {
      node.onclick = () =>
        safeEval(node.getAttribute("@click"), ctx);
    }

    if (node.hasAttribute?.("s-show")) {
      node.style.display = safeEval(node.getAttribute("s-show"), ctx)
        ? ""
        : "none";
    }

    if (node.hasAttribute?.("s-model")) {
      const key = node.getAttribute("s-model");
      node.value = ctx[key];
      node.oninput = () => (ctx[key] = node.value);
    }
  });
}

function walk(node, fn) {
  fn(node);
  node.childNodes.forEach(child => walk(child, fn));
}
