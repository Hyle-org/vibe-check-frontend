import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vue from "@vitejs/plugin-vue";
import copy from "rollup-plugin-copy";

import { nodeResolve } from "@rollup/plugin-node-resolve";
import { visualizer } from "rollup-plugin-visualizer";
import analyze from "rollup-plugin-analyzer";

import topLevelAwait from "vite-plugin-top-level-await";

const wasmContentTypePlugin = {
    name: "wasm-content-type-plugin",
    configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url.endsWith(".wasm")) {
                res.setHeader("Content-Type", "application/wasm");
            }
            next();
        });
    },
};

// https://vitejs.dev/config/
export default defineConfig({
    /*
    esbuild: {
        target: "esnext",
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "esnext",
        },
    },*/
    build: {
        sourcemap: false,
        minify: true,
        target: "esnext",
    },
    plugins: [
        vue(),
        copy({
            targets: [{ src: "node_modules/**/*.wasm", dest: "node_modules/.vite/deps" }],
            copySync: true,
            hook: "buildStart",
        }),
        wasmContentTypePlugin,
        nodePolyfills({
            include: ["buffer", "path", "fs", "os", "crypto", "stream", "vm"],
            globals: {
                Buffer: true, // can also be 'build', 'dev', or false
                global: true,
                process: true,
            },
            protocolImports: false,
        }),
        visualizer(),
        //analyze(),
    ],
});
