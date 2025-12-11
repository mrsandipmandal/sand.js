function createReactive(obj){
  const deps = new Map();
  const stack = [];
  function track(k){ const eff = stack[stack.length-1]; if(!eff) return; let s = deps.get(k); if(!s){ s=new Set(); deps.set(k,s);} s.add(eff); }
  function trigger(k){ const s = deps.get(k); if(!s) return; s.forEach(fn=>fn()); }
  const handler = { get(t,k){ if(k==='__isProxy') return true; track(k); const r=Reflect.get(t,k); return (r&&typeof r==='object')?createReactive(r).proxy:r; }, set(t,k,v){ const old=t[k]; const ok=Reflect.set(t,k,v); if(old!==v) trigger(k); return ok } };
  const proxy = new Proxy(Object.assign({}, obj || {}), handler);
  function effect(fn){ const wrapped = function(){ try{ stack.push(wrapped); fn(); } finally { stack.pop(); } }; wrapped(); return wrapped; }
  return { proxy, effect };
}

function safeEval(expr, ctx){ const names=Object.keys(ctx||{}); const vals=Object.values(ctx||{}); try{ const fn=new Function(...names,'with(this)return ('+expr+');'); return fn.apply(ctx, vals); }catch(e){ return undefined; } }

function mount(root = document.body) {
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

// Auto mount on DOM ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  } else {
    mount();
  }
}

var index = {
  mount,
  createReactive
};

export { createReactive, index as default, mount };
