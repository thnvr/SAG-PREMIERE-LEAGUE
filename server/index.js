/**
 * SAG PREMIERE LEAGUES - Backend Server Entry
 * Express + Socket.io + SQLite (sql.js)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { getDb, initSchema } = require('./db/database');
const { setupSocketIO } = require('./socket/handler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allow static image loads
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy DB initialization guard for serverless environments (Vercel)
let dbInitialized = false;
let dbInitPromise = null;

async function ensureDbReady() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await getDb();
      await initSchema();
      dbInitialized = true;
    })();
  }
  return dbInitPromise;
}

app.use('/api', async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('[Server] DB init error:', err);
    res.status(500).json({ error: 'Database initialization failed', message: err.message });
  }
});

// Ensure upload directories exist safely without throwing on read-only serverless platforms
const isVercel = Boolean(process.env.VERCEL);
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../uploads');
const playersUploadDir = path.join(uploadDir, 'players');
const teamsUploadDir = path.join(uploadDir, 'teams');
try {
  [uploadDir, playersUploadDir, teamsUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
} catch (dirErr) {
  console.warn('[Server] Cannot create upload directory (read-only environment):', dirErr.message);
}

// Serve uploaded media statically
app.use('/uploads', (req, res, next) => {
  const requestedFile = path.resolve(uploadDir, `.${req.path}`);
  const imagePath = /^\/(?:players|teams)\/.+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(req.path);

  if (fs.existsSync(requestedFile) || !imagePath) {
    return next();
  }

  res.type('image/svg+xml').send(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><rect width="200" height="240" fill="#18191f"/><circle cx="100" cy="78" r="42" fill="#596070"/><path d="M22 230c4-56 35-84 78-84s74 28 78 84" fill="#596070"/><path d="M20 229h160" stroke="#ffd000" stroke-width="4"/></svg>'
  );
});
app.use('/uploads', express.static(uploadDir));

// Route handlers - mounted on both /api/* and /* for compatibility with all hosting environments
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teamsRoutes = require('./routes/teams');
const playersRoutes = require('./routes/players');
const auctionRoutes = require('./routes/auction');
const bidsRoutes = require('./routes/bids');
const reportsRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const spectatorRoutes = require('./routes/spectator');

// Mount on /api/*
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/spectator', spectatorRoutes);

// Also mount without /api prefix for Vercel serverless rewrites
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/teams', teamsRoutes);
app.use('/players', playersRoutes);
app.use('/auction', auctionRoutes);
app.use('/bids', bidsRoutes);
app.use('/reports', reportsRoutes);
app.use('/audit-log', auditRoutes);
app.use('/spectator', spectatorRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.io event handlers
setupSocketIO(io);

// Server startup
async function startServer() {
  try {
    console.log('[Server] Initializing database...');
    await ensureDbReady();
    console.log('[Server] Database initialized.');

    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`⚽ SAG PREMIERE LEAGUES - Server Running`);
      console.log(`   Port:    http://localhost:${PORT}`);
      console.log(`   Client:  ${CLIENT_URL}`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

// If run directly with `node server/index.js`, start listening on port
if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.startServer = startServer;
