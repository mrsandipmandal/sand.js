// src/compiler.js
import { safeEval } from "./utils.js";
import { createReactive } from "./reactivity.js";
import * as directives from "./directives/index.js";

export function mount(root = document.body) {
  const components = root.querySelectorAll("[s-data]");
  components.forEach(el => {
    const initial = safeEval(el.getAttribute("s-data"), {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => state.effect(fn);

    // run root s-init if present
    if (el.hasAttribute("s-init")) {
      try { directives.sInit(el, ctx); } catch (e) { console.warn('[sandi-js] s-init error', e); }
    }

    // reactive refresh
    state.effect(() => {
      // sync shallow values to ctx
      Object.keys(state.proxy).forEach(k => ctx[k] = state.proxy[k]);
      refresh(el, ctx);
    });

    // remove s-data attr and cloak for this component
    el.removeAttribute("s-data");
    el.querySelectorAll("[s-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
  });
}

function refresh(root, ctx) {
  forEachNode(root, node => {
    if (node.nodeType !== 1) return;
    // s-ignore
    try { if (directives.sIgnore(node)) return; } catch (e) {}
    // refs / id / cloak
    if (node.hasAttribute("s-ref")) directives.sRef(node, ctx);
    if (node.hasAttribute("s-id")) directives.sId(node);
    if (node.hasAttribute("s-cloak")) directives.sCloak(node);

    // core rendering directives
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

    // event shorthand
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a) continue;
      if (a.name.startsWith("@") || a.name.startsWith("s-on:")) {
        directives.sOn(node, ctx, a.name);
      }
    }
  });
}

function forEachNode(root, fn) {
  fn(root);
  if (root.nodeType !== 1) return;
  try { if (directives.sIgnore(root)) return; } catch (e) {}
  const children = Array.from(root.childNodes || []);
  for (let i = 0; i < children.length; i++) forEachNode(children[i], fn);
}

export default { mount };
