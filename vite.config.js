import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/antd/es/color-picker/") ||
              id.includes("/node_modules/@rc-component/color-picker/")) return "color-picker";
        }
      },
      onwarn(warning, defaultHandler) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes('"use client"')) return;
        defaultHandler(warning);
      }
    }
  }
});
