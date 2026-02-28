import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { existsSync, mkdirSync } from 'fs';
import {
  authRoutes,
  projectRoutes,
  scriptRoutes,
  sceneRoutes,
  scheduleRoutes,
  taskRoutes,
  crewRoutes,
  readinessRoutes,
  notificationRoutes,
  reportRoutes,
  locationRoutes,
} from './routes/index.js';
import { errorHandler, notFound } from './utils/errors.js';
import { initWebSocket, getConnectedCount } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
if (!existsSync('uploads')) {
  mkdirSync('uploads', { recursive: true });
}
app.use('/uploads', express.static('uploads'));

// ── HEALTH CHECK ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'One Clapper API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    wsConnections: getConnectedCount(),
  });
});

// ── API ROUTES ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/scenes', sceneRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/crew', crewRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);

// ── ERROR HANDLING ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── SERVER START ───────────────────────────────────────────────────
const server = createServer(app);

// Initialize WebSocket on the same HTTP server
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       🎬 ONE CLAPPER - API SERVER           ║
║══════════════════════════════════════════════║
║  HTTP:  http://localhost:${PORT}               ║
║  WS:    ws://localhost:${PORT}/ws              ║
║  Mode:  ${process.env.NODE_ENV || 'development'}                     ║
╚══════════════════════════════════════════════╝
  `);
});

export default app;
