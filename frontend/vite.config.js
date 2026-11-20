import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

// Versión visible en la interfaz: package.json + commit de git
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
)

const obtenerCommit = () => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }

  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'local'
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    __BOLSATEC_VERSION__: JSON.stringify(version),
    __BOLSATEC_COMMIT__: JSON.stringify(obtenerCommit()),
    __BOLSATEC_FECHA__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
})
