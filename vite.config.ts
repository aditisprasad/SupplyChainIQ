import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      lodash: "lodash-es",
      "lodash/get": "lodash-es/get",
      "lodash/isEqual": "lodash-es/isEqual",
      "lodash/isFunction": "lodash-es/isFunction",
      "lodash/isObject": "lodash-es/isObject",
      "lodash/merge": "lodash-es/merge",
      "lodash/uniqueId": "lodash-es/uniqueId",
    },
  },
  optimizeDeps: {
    include: ["react-is", "lodash-es"],
  },
  build: {
    minify: false,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
  server: {
    port: 8080,
    host: true,
  },
});
