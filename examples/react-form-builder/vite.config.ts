import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { editorTypes } from './editor-types';

export default defineConfig({
  plugins: [
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
