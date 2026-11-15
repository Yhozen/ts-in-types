import { defineConfig } from "vite-plus";

/** Machine-generated or vendored files: not formatted or linted. */
const ignored = [
  "vendor/**",
  "oracle/**",
  "image/**",
  "experiments/**",
  ".run/**",
  "**/*.gen.ts",
  "**/*.gen.d.ts",
];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
    "*.{ts,mts,cts,tsx}": () => "tsrs --noEmit --fast",
  },
  lint: {
    ignorePatterns: ignored,
    options: { typeAware: true, typeCheck: false },
  },
  fmt: { ignorePatterns: ignored },
  test: { include: ["tests/**/*.test.ts"] },
});
