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

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const playersUploadDir = path.join(uploadDir, 'players');
const teamsUploadDir = path.join(uploadDir, 'teams');
[uploadDir, playersUploadDir, teamsUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/players', require('./routes/players'));
app.use('/api/auction', require('./routes/auction'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit-log', require('./routes/audit'));
app.use('/api/spectator', require('./routes/spectator'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.io event handlers
setupSocketIO(io);

// Server startup
async function startServer() {
  try {
    console.log('[Server] Initializing database...');
    await initSchema();
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

startServer();
