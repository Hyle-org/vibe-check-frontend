import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import copy from "rollup-plugin-copy";

// https://vitejs.dev/config/
export default defineConfig({
    esbuild: {
        target: 'esnext',
        supported: {
            'top-level-await': true
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext',
            supported: {
                'top-level-await': true
            },
        },
    },
    build: {
        sourcemap: 'inline',
        minify: false,
        target: 'esnext',
    },
    plugins: [
        vue(),
        copy({
            targets: [
                { src: 'node_modules/**/*.wasm', dest: 'node_modules/.vite/dist' },
            ],
            copySync: true,
            hook: 'buildStart',
        }),
    ],
});
