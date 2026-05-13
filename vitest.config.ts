import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest config for the test suite.
 *
 * - Vitest (not Jest) was chosen because configuring Jest cleanly against
 *   Next 16 + Tailwind v4 + React 19 + ESM is currently a meaningful yak-shave.
 *   The API is Jest-compatible (describe / it / expect / vi.fn), so the test
 *   files read identically to a Jest suite.
 * - jsdom environment so React Testing Library can render components.
 * - `@/*` alias mirrors tsconfig.json so test imports match app code.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
