import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import fastifyStatic from '@fastify/static';
import fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from './backend/routes.js';
import type { Store } from './backend/store.js';

const DEFAULT_PORT = 4173;

function isApiPath(url: string): boolean {
  const path = url.split('?', 1)[0] ?? '';
  return path === '/api' || path.startsWith('/api/');
}

function distPath(...segments: string[]): string {
  return resolve(process.cwd(), 'dist', ...segments);
}

export function buildApp(store?: Store): FastifyInstance {
  const app = fastify({ logger: false });

  registerRoutes(app, store);

  app.register(fastifyStatic, {
    root: distPath(),
    prefix: '/',
  });

  app.setNotFoundHandler((request, reply) => {
    const indexFile = distPath('index.html');
    if (isApiPath(request.url)) {
      reply.status(404).send({ error: 'Not found' });
      return;
    }
    if (request.method === 'GET' && existsSync(indexFile)) {
      reply.sendFile('index.html');
      return;
    }
    reply.status(404).send({ error: 'Not found' });
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = buildApp();
  const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
  const port = Number.isInteger(parsedPort) ? parsedPort : DEFAULT_PORT;
  try {
    await app.listen({ host: '0.0.0.0', port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  void startServer();
}
