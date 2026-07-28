import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

function copyAssets(srcDir, destDir) {
  try {
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    const files = readdirSync(srcDir);
    for (const file of files) {
      const srcPath = join(srcDir, file);
      const destPath = join(destDir, file);
      copyFileSync(srcPath, destPath);
    }
  } catch (error) {
    console.warn('[copy-manual] Failed to copy assets:', error.message);
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [{
    name: 'copy-manual',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/assets/PME使用说明书.md') {
          const manualPath = join(__dirname, 'src', 'assets', 'PME使用说明书.md');
          if (existsSync(manualPath)) {
            const content = fs.readFileSync(manualPath, 'utf8');
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(content);
            return;
          }
        }
        next();
      });
    },
    writeBundle() {
      const srcAssets = join(__dirname, 'src', 'assets');
      const destAssets = join(__dirname, 'dist', 'assets');
      copyAssets(srcAssets, destAssets);
    },
  }],
});
