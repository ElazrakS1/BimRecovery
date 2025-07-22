/** @type {import('vite').UserConfig} */
import react from '@vitejs/plugin-react'
import path from 'path'

export default {
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
      babel: {
        presets: ['@babel/preset-typescript']
      }
    })
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-toastify',
      'react-router-dom',
      '@headlessui/react',
      'framer-motion',
      'react-icons'
    ],
    force: true
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', 'framer-motion', 'react-icons']
        }
      }
    },
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5258',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5173,
    strictPort: true
  },
  define: {
    'process.env': process.env
  }
}
