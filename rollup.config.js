import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import dts from "rollup-plugin-dts";

// Create two separate configs - one for code, one for types
export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.mjs",
        format: "es",
        sourcemap: true,
      },
    ],
    external: [
      "react",
      "react-dom",
      "react-dropzone",
      "apexx-uploader-core",
      "clsx",
    ],
    plugins: [
      resolve({
        extensions: [".ts", ".tsx", ".css"],
      }),
      postcss({
        inject: true,
        modules: false,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
      }),
      commonjs(),
    ],
  },
];
