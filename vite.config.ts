import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Exposes the app to your local Wi-Fi network
    proxy: {
      // Forward /api/* to vercel dev server (port 3000) during local development
      '/api': 'http://localhost:3000',
    },
  },
})
