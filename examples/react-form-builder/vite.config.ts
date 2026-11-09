import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { editorTypes } from './editor-types';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    tailwindcss(),
    react(),
    // Types for the packages generated code can import, so the code editor shows real types.
    editorTypes([
      '@jfdevelops/react-multi-step-form',
      '@jfdevelops/multi-step-form-builder-core',
      'zod',
      'valibot',
      'arktype',
      'effect',
      'yup',
      'joi',
    ]),
  ],
  worker: { format: 'es' },
});
