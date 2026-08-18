import express from 'express';
import cors from 'cors';
import path from 'path';

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), db: 'supabase' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT contiene un valor inválido.');
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Oleoflores Server running on http://0.0.0.0:${port} with Supabase backend`);
  });
}

startServer().catch((error) => {
  console.error('No fue posible iniciar el servidor.', error);
  process.exitCode = 1;
});
