import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import packageJson from "./package.json";
import vue from "@vitejs/plugin-vue";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/lib.ts"),
      name: packageJson.name,
      fileName: (format) => `index.${format}.js`,
    },
    outDir: "dist", // 输出目录为 dist
    rollupOptions: {
      external: ["vue"], // Vue作为外部依赖，不打包进库中
      output: {
        globals: {
          vue: "Vue", // 在UMD构建中为Vue提供全局变量名
        },
        // 确保外部化处理的依赖不会被打包
        exports: "named",
      },
    },
    // 生成类型声明文件
    emptyOutDir: true,
  },
  // 确保.vue文件可以被正确处理
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
