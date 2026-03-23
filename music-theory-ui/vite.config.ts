import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress eval warning from google-protobuf (third-party, can't fix)
        if (
          warning.code === "EVAL" &&
          warning.id?.includes("google-protobuf")
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          "vendor-protobuf": ["google-protobuf"],
          "vendor-grpc": ["grpc-web"],
          "vendor-react": ["react", "react-dom"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["google-protobuf"],
  },
});
