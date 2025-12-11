export function safeEval(expr, ctx){ const names=Object.keys(ctx||{}); const vals=Object.values(ctx||{}); try{ const fn=new Function(...names,'with(this)return ('+expr+');'); return fn.apply(ctx, vals); }catch(e){ return undefined; } }
export function warn(...args){ if(typeof process !== 'undefined' && process.env && process.env.NODE_ENV==='production') return; console.warn(...args); }
