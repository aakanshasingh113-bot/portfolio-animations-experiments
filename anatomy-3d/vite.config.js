import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is the dev server + build tool. The React plugin lets it understand JSX.
export default defineConfig({
  plugins: [react()],
})
