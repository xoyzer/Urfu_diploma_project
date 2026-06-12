import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        exclude: ["lucide-react"],
    },
    server: {
        host: "0.0.0.0", // разрешает доступ с любых сетевых интерфейсов
        port: 5173,
        strictPort: true, // не ищет другой порт, если 5173 занят
    },
});
