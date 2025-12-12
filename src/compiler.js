// src/compiler.js
// New batched renderer + directive wiring
import { safeEval, getPath, setPath } from "./utils.js";
import { createReactive } from "./reactivity.js";
import * as directives from "./directives/index.js";

/**
 * Support both s- and x- prefixes.
 * Helpers to check attributes with either prefix.
 */
const prefixes = ["s-", "x-"];

function hasAttrEither(el, name) {
  for (const p of prefixes) if (el.hasAttribute(p + name)) return true;
  return false;
}
function getAttrEither(el, name) {
  for (const p of prefixes) {
    const v = el.getAttribute(p + name);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}
function removeAttrEither(el, name) {
  for (const p of prefixes) el.removeAttribute(p + name);
}

/* -------------------- Scheduler (microtask-batched) -------------------- */
const Scheduler = (function () {
  let queue = [];
  let flushing = false;

  function schedule(fn) {
    queue.push(fn);
    if (!flushing) {
      flushing = true;
      Promise.resolve().then(flush).catch(err => {
        // ensure reset on error
        flushing = false;
        queue = [];
        console.error("[sandi-js] scheduler error", err);
      });
    }
  }

  function flush() {
    try {
      const q = queue.slice();
      queue = [];
      for (let i = 0; i < q.length; i++) {
        try {
          q[i]();
        } catch (err) {
          console.error("[sandi-js] task error", err);
        }
      }
    } finally {
      flushing = false;
    }
  }

  return { schedule };
})();

/* -------------------- Component mounting -------------------- */

export function mount(root = document.body) {
  // find all components (elements with s-data or x-data)
  const selector = prefixes.map(p => `[${p}data]`).join(",");
  const components = root.querySelectorAll(selector);

  components.forEach(el => {
    // read expression from either prefix
    const exp = getAttrEither(el, "data") || "{}";
    const initial = safeEval(exp, {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    // helper containers available in expressions
    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = (fn) => state.effect(fn);

    // run component-level init (s-init / x-init)
    const initExp = getAttrEither(el, "init");
    if (initExp) {
      try {
        safeEval(initExp, ctx);
      } catch (err) {
        console.warn("[sandi-js] s-init error", err);
      }
    }

    // schedule render when reactive deps change (batched)
    state.effect(() => {
      // sync shallow properties into ctx to make getPath work on ctx itself
      Object.keys(state.proxy).forEach(k => {
        try { ctx[k] = state.proxy[k]; } catch (e) {}
      });

      // schedule the render for this component (batched)
      Scheduler.schedule(() => renderComponent(el, ctx));
    });

    // cleanup attributes to avoid remount in some environments
    removeAttrEither(el, "data");

    // remove cloak for component root & descendants immediately after mount
    el.querySelectorAll("[s-cloak],[x-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (el.hasAttribute("s-cloak") || el.hasAttribute("x-cloak")) {
      el.removeAttribute("s-cloak");
      el.removeAttribute("x-cloak");
    }
  });
}

/* -------------------- Rendering / directive application -------------------- */

function renderComponent(rootEl, ctx) {
  // walk the component subtree and apply directives
  walk(rootEl, node => {
    if (node.nodeType !== 1) return; // element nodes only

    // s-ignore / x-ignore - skip entirely
    try {
      if (hasAttrEither(node, "ignore")) {
        return true; // stop walking this subtree
      }
    } catch (e) {}

    // s-ref / x-ref
    if (hasAttrEither(node, "ref")) {
      directives.sRef && directives.sRef(node, ctx);
    }

    // s-id / x-id
    if (hasAttrEither(node, "id")) {
      directives.sId && directives.sId(node, ctx);
    }

    // s-cloak / x-cloak
    if (hasAttrEither(node, "cloak")) {
      directives.sCloak && directives.sCloak(node, ctx);
    }

    // s-text / x-text
    if (hasAttrEither(node, "text")) {
      try { directives.sText && directives.sText(node, ctx); } catch(e){ console.warn('[sandi-js] s-text',e); }
    }

    // s-html / x-html
    if (hasAttrEither(node, "html")) {
      try { directives.sHtml && directives.sHtml(node, ctx); } catch(e){ console.warn('[sandi-js] s-html',e); }
    }

    // s-show / x-show
    if (hasAttrEither(node, "show")) {
      try { directives.sShow && directives.sShow(node, ctx); } catch(e){ console.warn('[sandi-js] s-show',e); }
    }

    // s-bind / x-bind
    if (hasAttrEither(node, "bind")) {
      try { directives.sBind && directives.sBind(node, ctx); } catch(e){ console.warn('[sandi-js] s-bind',e); }
    }

    // s-if / x-if (structural)
    if (hasAttrEither(node, "if")) {
      try { directives.sIf && directives.sIf(node, ctx); } catch(e){ console.warn('[sandi-js] s-if',e); }
      // after s-if, the node may be detached; if so, skip its children
      if (!node.isConnected) return true;
    }

    // s-for / x-for (if you have implemented; keep as separate directive)
    if (hasAttrEither(node, "for")) {
      if (directives.sFor) {
        try { directives.sFor(node, ctx); } catch(e){ console.warn('[sandi-js] s-for',e); }
        // s-for may replace children; safe to continue walking
        if (!node.isConnected) return true;
      }
    }

    // s-model / x-model
    if (hasAttrEither(node, "model")) {
      try { directives.sModel && directives.sModel(node, ctx); } catch(e){ console.warn('[sandi-js] s-model',e); }
    }

    // s-modelable / x-modelable
    if (hasAttrEither(node, "modelable")) {
      try { directives.sModelable && directives.sModelable(node, ctx); } catch(e){ console.warn('[sandi-js] s-modelable',e); }
    }

    // s-effect / x-effect
    if (hasAttrEither(node, "effect")) {
      try { directives.sEffect && directives.sEffect(node, ctx); } catch(e){ console.warn('[sandi-js] s-effect',e); }
    }

    // s-teleport / x-teleport
    if (hasAttrEither(node, "teleport")) {
      try { directives.sTeleport && directives.sTeleport(node, ctx); } catch(e){ console.warn('[sandi-js] s-teleport',e); }
    }

    // s-transition / x-transition
    if (hasAttrEither(node, "transition")) {
      try { directives.sTransition && directives.sTransition(node, ctx); } catch(e){ console.warn('[sandi-js] s-transition',e); }
    }

    // event shorthand: @click or @event  OR s-on:event / x-on:event
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a) continue;
      const name = a.name;
      if (name.startsWith("@") || name.startsWith("s-on:") || name.startsWith("x-on:")) {
        try { directives.sOn && directives.sOn(node, ctx, name); } catch(e){ console.warn('[sandi-js] s-on',e); }
      }
    }

    // continue walking children normally
    return;
  });
}

/* -------------------- utility walker -------------------- */
/**
 * walk(root, fn) — depth-first.
 * If fn returns true at a node, skip its children.
 */
function walk(root, fn) {
  const stop = fn(root);
  if (stop) return;
  // only walk element children (and text nodes will be ignored by fn early)
  const children = Array.from(root.childNodes || []);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) {
      // element
      walk(child, fn);
    } else {
      // still call fn for non-elements in case directives operate on text nodes (rare)
      fn(child);
    }
  }
}

/* -------------------- export -------------------- */
export { mount };
export default { mount };