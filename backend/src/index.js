import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, seedDemoBusiness } from './db.js';
import messageRoutes from './routes/message.js';
import leadsRoutes from './routes/leads.js';
import bookingsRoutes from './routes/bookings.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // Initialize database and seed demo data
  console.log('🏢 Initializing database...');
  const db = getDb();
  seedDemoBusiness();
  console.log('  ✓ Database ready');

  const app = Fastify({
    logger: {
      level: 'info'
    }
  });

  // CORS — allow embedding the widget on any domain
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // API routes
  await app.register(messageRoutes);
  await app.register(leadsRoutes);
  await app.register(bookingsRoutes);
  await app.register(dashboardRoutes);

  // Serve static dashboard build (if exists)
  const dashboardDist = path.join(__dirname, '..', '..', 'dashboard', 'dist');
  const { existsSync } = await import('fs');
  if (existsSync(dashboardDist)) {
    await app.register(staticFiles, {
      root: dashboardDist,
      prefix: '/dashboard/',
      decorateReply: false,
      wildcard: false  // We'll handle SPA routes manually
    });

    // Serve explicit files
    app.get('/dashboard', async (req, reply) => {
      return reply.sendFile('index.html', dashboardDist);
    });

    // Dashboard SPA — catch-all route (after static registration to avoid conflict)
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith('/dashboard/')) {
        return reply.sendFile('index.html', dashboardDist);
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  // Serve the chat widget JS
  const widgetDist = path.join(__dirname, '..', '..', 'widget', 'dist');
  if (existsSync(widgetDist)) {
    await app.register(staticFiles, {
      root: widgetDist,
      prefix: '/widget/',
      decorateReply: false
    });
  }

  // Root route — API info
  app.get('/', async (req, reply) => {
    return reply.send({
      name: 'FrontDesk AI',
      version: '0.1.0',
      description: 'AI Sales Assistant API — 24/7 lead capture and booking',
      endpoints: {
        'POST /api/conversations': 'Start a new conversation',
        'POST /api/message': 'Send a message in a conversation',
        'GET /api/conversations/:id/messages': 'Get conversation history',
        'GET /api/businesses': 'List businesses',
        'GET /api/businesses/:id/stats': 'Get dashboard stats',
        'GET /api/businesses/:id/leads': 'Get leads for a business',
        'POST /api/bookings': 'Create a booking'
      },
      docs: '/api',
      dashboard: '/dashboard/'
    });
  });

  // Health check
  app.get('/api/health', async (req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 FrontDesk AI server running on http://0.0.0.0:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Dashboard: http://localhost:${PORT}/dashboard/`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();