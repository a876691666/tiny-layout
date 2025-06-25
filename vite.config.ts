import { defineConfig } from "vite";
import packageJson from "./package.json";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  base: `/${packageJson.name}`,
  plugins: [vue()],
});
