import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function serviceWorkerManifestPlugin(): import("vite").Plugin {
  return {
    name: "service-worker-manifest",
    generateBundle(_options, bundle) {
      const assets = Object.values(bundle as Record<string, { type: string; fileName: string; isEntry?: boolean }>)
        .filter((chunk) =>
          (chunk.type === "chunk" && chunk.isEntry) ||
          (chunk.type === "asset" && chunk.fileName.endsWith(".css")),
        )
        .map((chunk) => `/${chunk.fileName}`)
        .filter((fileName) => !fileName.endsWith("sw-manifest.js"));

      const manifest = {
        version: Date.now().toString(36),
        assets: ["/", "/index.html", ...assets],
      };

      this.emitFile({
        type: "asset",
        fileName: "sw-manifest.js",
        source: `self.__SW_MANIFEST = ${JSON.stringify(manifest)};`,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __SW_BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  esbuild: {
    legalComments: "none",
    drop: mode === "production" ? ["debugger"] : [],
    pure: mode === "production" ? ["console.debug"] : [],
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(__dirname, "."), path.resolve(__dirname, "./backend")],
    },
    proxy: {
      "/public": {
        target: "https://cf.h-db.site",
        changeOrigin: true,
        secure: true,
      },
      "/internal": {
        target: "https://cf.h-db.site",
        changeOrigin: true,
        secure: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), serviceWorkerManifestPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        entryFileNames: "_/[hash].js",
        chunkFileNames: "_/[hash].js",
        assetFileNames(assetInfo) {
          const names = assetInfo.names ?? [];
          if (names.includes("sw-manifest.js")) return "sw-manifest.js";
          return "_/[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
