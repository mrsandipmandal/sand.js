# sand.JS

**sand.JS** — a tiny, zero-build, attribute-driven JavaScript micro-framework inspired by Alpine.js.  
Add interactivity directly in HTML using `s-` directives. Small, audit-friendly, and friendly to server-rendered pages.

- Size goal: **< 20KB gzipped**
- Prefix: `s-` (event shorthand `@click`)
- No virtual DOM — direct DOM updates
- Minimal plugin API

---

## Quick demo

```html
<!doctype html>
<html>
  <head><meta charset="utf-8"><title>sand.JS demo</title></head>
  <body>
    <div s-data="{ open: false, count: 0 }">
      <button @click="open = !open">Toggle</button>
      <div s-show="open">Hello! <span s-text="count"></span></div>
      <button @click="count = count + 1">+1</button>
    </div>

    <!-- from CDN after publishing -->
    <script src="https://unpkg.com/sand.js/dist/sand.min.js" defer></script>
  </body>
</html>
