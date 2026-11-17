import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// El lab no es un workspace: vive fuera de `workspaces` y resuelve `@mandor/ui` por los
// symlinks que npm ya dejó en el `node_modules` raíz. Vite compila su TS de fuente igual
// que compila el de las apps.
export default defineConfig({
    server: { port: 4310, strictPort: true },
    plugins: [tailwindcss()],
});
