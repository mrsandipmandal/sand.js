import { mount } from "./compiler.js";

// auto-mount on DOM ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  } else {
    mount();
  }
}

export { mount };
export default { mount };
