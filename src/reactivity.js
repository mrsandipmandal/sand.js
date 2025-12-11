export function createReactive(obj){
  const deps = new Map();
  const stack = [];
  function track(k){ const eff = stack[stack.length-1]; if(!eff) return; let s = deps.get(k); if(!s){ s=new Set(); deps.set(k,s);} s.add(eff); }
  function trigger(k){ const s = deps.get(k); if(!s) return; s.forEach(fn=>fn()); }
  const handler = { get(t,k){ if(k==='__isProxy') return true; track(k); const r=Reflect.get(t,k); return (r&&typeof r==='object')?createReactive(r).proxy:r; }, set(t,k,v){ const old=t[k]; const ok=Reflect.set(t,k,v); if(old!==v) trigger(k); return ok } };
  const proxy = new Proxy(Object.assign({}, obj || {}), handler);
  function effect(fn){ const wrapped = function(){ try{ stack.push(wrapped); fn(); } finally { stack.pop(); } }; wrapped(); return wrapped; }
  return { proxy, effect };
}
