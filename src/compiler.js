import { safeEval } from "./utils.js";
import { createReactive } from "./reactivity.js";
import * as directives from "./directives/index.js";

export function mount(root = document.body) {
  const components = root.querySelectorAll("[s-data]");

  components.forEach(el => {
    const initial = safeEval(el.getAttribute("s-data"), {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    ctx.$refs = {};
    ctx.$modelable = {};
    ctx.__effect = fn => state.effect(fn);

    forEachNode(el, node => {
      // s-init only runs once per element
      if (node.hasAttribute("s-init")) {
        directives.sInit(node, ctx);
      }
    });

    state.effect(() => refresh(el, ctx));
  });
}

function refresh(root, ctx) {
  forEachNode(root, node => {

    if (node.nodeType !== 1) return;

    if (directives.sIgnore(node)) return;
    
    if (node.hasAttribute("s-ref")) directives.sRef(node, ctx);
    if (node.hasAttribute("s-id")) directives.sId(node);
    if (node.hasAttribute("s-cloak")) directives.sCloak(node);
    if (node.hasAttribute("s-text")) directives.sText(node, ctx);
    if (node.hasAttribute("s-html")) directives.sHtml(node, ctx);
    if (node.hasAttribute("s-show")) directives.sShow(node, ctx);
    if (node.hasAttribute("s-bind")) directives.sBind(node, ctx);
    if (node.hasAttribute("s-if")) directives.sIf(node, ctx);
    if (node.hasAttribute("s-effect")) directives.sEffect(node, ctx);
    if (node.hasAttribute("s-model")) directives.sModel(node, ctx);
    if (node.hasAttribute("s-modelable")) directives.sModelable(node, ctx);
    if (node.hasAttribute("s-teleport")) directives.sTeleport(node, ctx);
    if (node.hasAttribute("s-transition")) directives.sTransition(node, ctx);

    // Event directives @click or s-on:click
    Array.from(node.attributes).forEach(attr => {
      if (attr.name.startsWith("@") || attr.name.startsWith("s-on:")) {
        directives.sOn(node, ctx, attr.name);
      }
    });
  });
}

function forEachNode(root, fn) {
  fn(root);
  if (directives.sIgnore(root)) return;
  root.childNodes.forEach(n => forEachNode(n, fn));
}
