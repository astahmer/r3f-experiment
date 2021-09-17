import reactRefresh from "@vitejs/plugin-react-refresh";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import reactJsx from "vite-react-jsx";

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    root: "./",
    optimizeDeps: { include: ["@react-three/flex"] },
    plugins: [reactRefresh(), reactJsx(), VitePWA()],
    resolve: {
        alias: [
            { find: "@", replacement: "/src" },
            { find: "@react-three/flex", replacement: "./node_modules/react-three-flex/src/index.ts" },
            { find: "react-three-fiber", replacement: "@react-three/fiber" },
        ],
    },
});
