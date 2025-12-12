// src/compiler.js
import { safeEval } from "./utils.js";
import { createReactive } from "./reactivity.js";
import * as directives from "./directives/index.js";

/* support s- and x- prefixes */
const PREFIXES = ["s-", "x-"];
function hasAttr(el, name) { return PREFIXES.some(p => el.hasAttribute(p + name)); }
function getAttr(el, name) { for (const p of PREFIXES) { const v = el.getAttribute(p + name); if (v != null) return v; } return null; }
function removeAttr(el, name) { PREFIXES.forEach(p => el.removeAttribute(p + name)); }

/* microtask scheduler */
const Scheduler = (() => {
  let q = [], flushing = false;
  function schedule(fn) {
    if (typeof fn !== "function") return;
    q.push(fn);
    if (!flushing) {
      flushing = true;
      Promise.resolve().then(() => {
        const jobs = q.slice(); q = []; jobs.forEach(j => { try { j(); } catch (e) { console.error('[sandi-js] job error', e); } }); flushing = false;
      }).catch(err => { flushing = false; q = []; console.error('[sandi-js] scheduler error', err); });
    }
  }
  return { schedule };
})();

/* mount */
function mount(root = document.body) {
  if (!root || !root.querySelectorAll) return;
  const selector = PREFIXES.map(p => `[${p}data]`).join(",");
  const roots = root.querySelectorAll(selector);
  roots.forEach(node => {
    const expr = getAttr(node, "data") || "{}";
    const initial = safeEval(expr, {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => state.effect(fn);

    const initExp = getAttr(node, "init");
    if (initExp) try { safeEval(initExp, ctx); } catch (e) { console.warn('[sandi-js] s-init error', e); }

    state.effect(() => {
      Scheduler.schedule(() => render(node, ctx));
    });

    removeAttr(node, "data");

    node.querySelectorAll("[s-cloak],[x-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (node.hasAttribute("s-cloak")) node.removeAttribute("s-cloak");
    if (node.hasAttribute("x-cloak")) node.removeAttribute("x-cloak");
  });
}

/* render: walk tree and apply directives */
function render(root, ctx) {
  walk(root, node => {
    if (node.nodeType !== 1) return;
    try { if (hasAttr(node, "ignore")) return true; } catch (e) {}
    if (hasAttr(node, "ref")) try { directives.sRef && directives.sRef(node, ctx); } catch (e) {}
    if (hasAttr(node, "id")) try { directives.sId && directives.sId(node, ctx); } catch (e) {}
    if (hasAttr(node, "cloak")) try { directives.sCloak && directives.sCloak(node, ctx); } catch (e) {}
    if (hasAttr(node, "text")) try { directives.sText && directives.sText(node, ctx); } catch (e) {}
    if (hasAttr(node, "html")) try { directives.sHtml && directives.sHtml(node, ctx); } catch (e) {}
    if (hasAttr(node, "show")) try { directives.sShow && directives.sShow(node, ctx); } catch (e) {}
    if (hasAttr(node, "bind")) try { directives.sBind && directives.sBind(node, ctx); } catch (e) {}
    if (hasAttr(node, "if")) { try { directives.sIf && directives.sIf(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "for")) { try { directives.sFor && directives.sFor(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "model")) try { directives.sModel && directives.sModel(node, ctx); } catch (e) {}
    if (hasAttr(node, "modelable")) try { directives.sModelable && directives.sModelable(node, ctx); } catch (e) {}
    if (hasAttr(node, "effect")) try { directives.sEffect && directives.sEffect(node, ctx); } catch (e) {}
    if (hasAttr(node, "teleport")) { try { directives.sTeleport && directives.sTeleport(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "transition")) try { directives.sTransition && directives.sTransition(node, ctx); } catch (e) {}
    if (hasAttr(node, "init")) try { directives.sInit && directives.sInit(node, ctx); } catch (e) {}

    // events
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i]; if (!a) continue;
      const name = a.name;
      if (name.startsWith("@") || name.startsWith("s-on:") || name.startsWith("x-on:")) {
        try { directives.sOn && directives.sOn(node, ctx, name); } catch (e) { console.warn('[sandi-js] s-on', e); }
      }
    }

    return;
  });
}

/* walk */
function walk(node, fn) {
  const skip = fn(node);
  if (skip === true) return;
  const children = Array.from(node.childNodes || []);
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.nodeType === 1) walk(c, fn);
    else try { fn(c); } catch (e) {}
  }
}

export { mount };
export default { mount };
