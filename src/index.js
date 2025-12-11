import { createReactive } from "./reactivity.js";
import { mount } from "./compiler.js";

// Auto mount on DOM ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  } else {
    mount();
  }
}

export default {
  mount,
  createReactive
};

export { mount, createReactive };
