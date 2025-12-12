// src/compiler.js
// Alpine-like renderer for sandi-js supporting both s-* and x-* prefixes.

import { safeEval } from "./utils.js";
import { createReactive } from "./reactivity.js";
import * as directives from "./directives/index.js";

/* ------- prefix helpers (support s- and x-) ------- */
const PREFIXES = ["s-", "x-"];

function attrNamesFor(name) {
  return PREFIXES.map(p => p + name);
}

function hasAttrEither(el, name) {
  for (const p of PREFIXES) if (el.hasAttribute(p + name)) return true;
  return false;
}

function getAttrEither(el, name) {
  for (const p of PREFIXES) {
    const v = el.getAttribute(p + name);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

function removeAttrEither(el, name) {
  for (const p of PREFIXES) el.removeAttribute(p + name);
}

/* ------------------ Scheduler (microtask-batched) ------------------ */
const Scheduler = (function () {
  let queue = [];
  let flushing = false;

  function schedule(job) {
    if (typeof job !== "function") return;
    queue.push(job);
    if (!flushing) {
      flushing = true;
      Promise.resolve().then(flush).catch(err => {
        flushing = false;
        queue = [];
        console.error("[sandi-js] Scheduler error:", err);
      });
    }
  }

  function flush() {
    try {
      const jobs = queue.slice();
      queue = [];
      for (let i = 0; i < jobs.length; i++) {
        try { jobs[i](); } catch (err) {
          console.error("[sandi-js] job error:", err);
        }
      }
    } finally {
      flushing = false;
    }
  }

  return { schedule };
})();

/* ------------------ Mounting / component lifecycle ------------------ */

/**
 * mount(root = document.body)
 * Finds all elements with s-data/x-data, creates reactive scopes,
 * and schedules renders.
 */
function mount(root = document.body) {
  if (!root || typeof root.querySelectorAll !== "function") return;

  const selector = PREFIXES.map(p => `[${p}data]`).join(",");
  const roots = root.querySelectorAll(selector);

  roots.forEach(node => {
    // read data expression (s-data or x-data)
    const expr = getAttrEither(node, "data") || "{}";
    const initial = safeEval(expr, {}) || {};

    const scope = createReactive(initial);
    const ctx = scope.proxy;

    // helpers available inside expressions
    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => scope.effect(fn);

    // run component-level init once (s-init / x-init)
    const initExp = getAttrEither(node, "init");
    if (initExp) {
      try { safeEval(initExp, ctx); } catch (err) { console.warn("[sandi-js] s-init error", err); }
    }

    // schedule render when reactive deps change (batched)
    scope.effect(() => {
      // sync shallow properties into ctx so directives can read them
      Object.keys(scope.proxy).forEach(k => {
        try { ctx[k] = scope.proxy[k]; } catch (e) {}
      });

      // schedule the component render (microtask)
      Scheduler.schedule(() => renderComponent(node, ctx));
    });

    // Remove data attribute to avoid duplicate mounts in some environments
    removeAttrEither(node, "data");

    // remove cloak for this component immediately after mount
    node.querySelectorAll("[s-cloak],[x-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (node.hasAttribute("s-cloak")) node.removeAttribute("s-cloak");
    if (node.hasAttribute("x-cloak")) node.removeAttribute("x-cloak");
  });
}

/* ------------------ Rendering logic ------------------ */

/**
 * renderComponent(rootEl, ctx)
 * Walks the component subtree and applies directives.
 * Structural directives (s-if, s-for) may modify DOM; after s-if we skip children if detached.
 */
function renderComponent(rootEl, ctx) {
  if (!rootEl) return;
  walk(rootEl, (node) => {
    // only element nodes should be processed for directives (nodeType === 1)
    if (node.nodeType !== 1) return;

    // s-ignore / x-ignore: skip subtree
    try {
      if (hasAttrEither(node, "ignore")) return true;
    } catch (err) { /* defensive */ }

    // basic non-destructive directives
    if (hasAttrEither(node, "ref")) {
      try { directives.sRef && directives.sRef(node, ctx); } catch (e) { console.warn("[sandi-js] s-ref", e); }
    }

    if (hasAttrEither(node, "id")) {
      try { directives.sId && directives.sId(node, ctx); } catch (e) { console.warn("[sandi-js] s-id", e); }
    }

    if (hasAttrEither(node, "cloak")) {
      try { directives.sCloak && directives.sCloak(node, ctx); } catch (e) { /* ignore */ }
    }

    if (hasAttrEither(node, "text")) {
      try { directives.sText && directives.sText(node, ctx); } catch (e) { console.warn("[sandi-js] s-text", e); }
    }

    if (hasAttrEither(node, "html")) {
      try { directives.sHtml && directives.sHtml(node, ctx); } catch (e) { console.warn("[sandi-js] s-html", e); }
    }

    if (hasAttrEither(node, "show")) {
      try { directives.sShow && directives.sShow(node, ctx); } catch (e) { console.warn("[sandi-js] s-show", e); }
    }

    if (hasAttrEither(node, "bind")) {
      try { directives.sBind && directives.sBind(node, ctx); } catch (e) { console.warn("[sandi-js] s-bind", e); }
    }

    // structural directive s-if/x-if — may remove node from DOM
    if (hasAttrEither(node, "if")) {
      try { directives.sIf && directives.sIf(node, ctx); } catch (e) { console.warn("[sandi-js] s-if", e); }
      // if node was removed, skip its children
      if (!node.isConnected) return true;
    }

    // s-for/x-for — delegated to directive if implemented (may mutate children)
    if (hasAttrEither(node, "for")) {
      if (directives.sFor) {
        try { directives.sFor(node, ctx); } catch (e) { console.warn("[sandi-js] s-for", e); }
        if (!node.isConnected) return true;
      }
    }

    // s-model/x-model (two-way)
    if (hasAttrEither(node, "model")) {
      try { directives.sModel && directives.sModel(node, ctx); } catch (e) { console.warn("[sandi-js] s-model", e); }
    }

    // s-modelable/x-modelable
    if (hasAttrEither(node, "modelable")) {
      try { directives.sModelable && directives.sModelable(node, ctx); } catch (e) { console.warn("[sandi-js] s-modelable", e); }
    }

    // s-effect/x-effect (register reactive effect)
    if (hasAttrEither(node, "effect")) {
      try { directives.sEffect && directives.sEffect(node, ctx); } catch (e) { console.warn("[sandi-js] s-effect", e); }
    }

    // s-teleport/x-teleport (move element)
    if (hasAttrEither(node, "teleport")) {
      try { directives.sTeleport && directives.sTeleport(node, ctx); } catch (e) { console.warn("[sandi-js] s-teleport", e); }
      if (!node.isConnected) return true;
    }

    // s-transition/x-transition (apply transition)
    if (hasAttrEither(node, "transition")) {
      try { directives.sTransition && directives.sTransition(node, ctx); } catch (e) { console.warn("[sandi-js] s-transition", e); }
    }

    // s-init / x-init on nested elements (run once)
    if (hasAttrEither(node, "init")) {
      try { directives.sInit && directives.sInit(node, ctx); } catch (e) { console.warn("[sandi-js] s-init (nested)", e); }
    }

    // event shorthand: @click or s-on:click / x-on:click
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a) continue;
      const name = a.name;
      if (name.startsWith("@") || name.startsWith("s-on:") || name.startsWith("x-on:")) {
        try { directives.sOn && directives.sOn(node, ctx, name); } catch (e) { console.warn("[sandi-js] s-on", e); }
      }
    }

    // continue walking children (default)
    return; // undefined
  });
}

/* ------------------ DOM walker ------------------ */
/**
 * walk(root, fn)
 * Depth-first traversal. If fn returns true for a node, skip its children.
 */
function walk(root, fn) {
  const skip = fn(root);
  if (skip === true) return;
  const children = Array.from(root.childNodes || []);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) {
      walk(child, fn);
    } else {
      // still call fn for non-element nodes so directives can operate on text if needed
      try { fn(child); } catch (e) {}
    }
  }
}

/* ------------------ exports ------------------ */
export { mount };
export default { mount };
