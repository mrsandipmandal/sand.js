import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default [
  // ES Module Build
  {
    input: "src/index.js",
    output: {
      file: "dist/sand.esm.js",
      format: "esm"
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },

  // UMD Minified Build
  {
    input: "src/index.js",
    output: {
      file: "dist/sand.min.js",
      name: "SandJS",   // UMD global variable
      format: "umd"
    },
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ]
  }
];
