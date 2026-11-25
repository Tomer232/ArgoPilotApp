// Vitest settings: tests are the *.test.ts(x) files next to the code in src/lib.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The same "@/" alias as tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // `npm run coverage` fails if any measure of src/lib drops below 100%.
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      reporter: ["text", "html"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
