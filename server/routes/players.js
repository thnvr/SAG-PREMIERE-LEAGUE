/**
 * SAG PREMIERE LEAGUES - Player Management Routes (Enhanced)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, all, run, formatMoney, transaction, exec } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parse } = require('csv-parse/sync');

const uploadDir = path.join(__dirname, '../../uploads/players');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `player-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/players - List players with search & filters
router.get('/', (req, res) => {
  const { search, position, status, category, minPrice, maxPrice, isShortlisted, sortBy = 'name', sortOrder = 'ASC' } = req.query;

  let query = `
    SELECT p.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM players p
    LEFT JOIN teams t ON p.sold_to_team_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (p.name LIKE ? OR p.player_number LIKE ? OR p.nationality LIKE ? OR p.club LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (position && position !== 'ALL') {
    query += ` AND (p.primary_position = ? OR p.secondary_positions LIKE ?)`;
    params.push(position, `%"${position}"%`);
  }

  if (status && status !== 'ALL') {
    query += ` AND p.auction_status = ?`;
    params.push(status);
  }

  if (category && category !== 'ALL') {
    query += ` AND p.category = ?`;
    params.push(category);
  }

  if (isShortlisted !== undefined && isShortlisted !== 'ALL') {
    query += ` AND p.is_shortlisted = ?`;
    params.push(isShortlisted === '1' || isShortlisted === 'true' ? 1 : 0);
  }

  if (minPrice) {
    query += ` AND p.base_price >= ?`;
    params.push(parseInt(minPrice, 10));
  }

  if (maxPrice) {
    query += ` AND p.base_price <= ?`;
    params.push(parseInt(maxPrice, 10));
  }

  const validSortCols = ['name', 'base_price', 'overall_rating', 'sold_price', 'player_number', 'auction_order', 'is_shortlisted'];
  const sortCol = validSortCols.includes(sortBy) ? sortBy : 'name';
  const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  query += ` ORDER BY p.${sortCol} ${order}`;

  const players = all(query, params).map(p => {
    try {
      p.secondary_positions = JSON.parse(p.secondary_positions || '[]');
      p.badges = JSON.parse(p.badges || '[]');
    } catch (e) {}
    p.formattedBasePrice = formatMoney(p.base_price);
    p.formattedSoldPrice = p.sold_price ? formatMoney(p.sold_price) : null;
    return p;
  });

  res.json(players);
});

// GET /api/players/:id - Single player profile
router.get('/:id', (req, res) => {
  const player = get(`
    SELECT p.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM players p
    LEFT JOIN teams t ON p.sold_to_team_id = t.id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  try {
    player.secondary_positions = JSON.parse(player.secondary_positions || '[]');
    player.badges = JSON.parse(player.badges || '[]');
  } catch (e) {}

  player.formattedBasePrice = formatMoney(player.base_price);
  player.formattedSoldPrice = player.sold_price ? formatMoney(player.sold_price) : null;

  const bids = all(`
    SELECT b.*, t.name as team_name, t.short_name as team_short, u.display_name as bidder_name
    FROM bids b
    JOIN teams t ON b.team_id = t.id
    JOIN users u ON b.bidder_user_id = u.id
    WHERE b.player_id = ?
    ORDER BY b.amount DESC
  `, [player.id]);

  res.json({ ...player, bids });
});

// POST /api/players/upload - Upload photo standalone
router.post('/upload', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const photoUrl = `/uploads/players/${req.file.filename}`;
  res.json({ photoUrl });
});

// PUT /api/players/shortlist - Update tick list of available players
router.put('/shortlist', authenticate, requireAdmin, (req, res) => {
  const { playerIds, isShortlisted = 1 } = req.body;
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return res.status(400).json({ error: 'playerIds array required' });
  }

  const val = isShortlisted ? 1 : 0;
  transaction(() => {
    for (const id of playerIds) {
      exec('UPDATE players SET is_shortlisted = ? WHERE id = ?', [val, id]);
    }
  });

  // Broadcast updated state
  if (req.app.get('io')) {
    const { getFullAuctionState } = require('../services/auction');
    req.app.get('io').emit('auction:state', getFullAuctionState());
  }

  res.json({ success: true, count: playerIds.length, isShortlisted: val });
});

// POST /api/players - Register player (Auctioneer & Super Admin)
router.post('/', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  const {
    name, player_number, primary_position, secondary_positions,
    base_price, age, jersey_number, nationality, preferred_foot,
    height, biography, overall_rating, futbin_rating, speed_rating, shooting_rating,
    passing_rating, dribbling_rating, defensive_rating, physical_rating,
    category, card_style, badges, club, is_shortlisted
  } = req.body;

  if (!name || !primary_position || !base_price) {
    return res.status(400).json({ error: 'Name, primary position, and base price are required' });
  }

  const playerId = uuidv4();
  const photoUrl = req.file ? `/uploads/players/${req.file.filename}` : (req.body.photo_url || '');

  let secPos = '[]';
  if (Array.isArray(secondary_positions)) {
    secPos = JSON.stringify(secondary_positions);
  } else if (typeof secondary_positions === 'string') {
    try {
      secPos = JSON.stringify(JSON.parse(secondary_positions));
    } catch {
      secPos = JSON.stringify(secondary_positions.split(',').map(s => s.trim()).filter(Boolean));
    }
  }

  let badgesJson = '[]';
  if (Array.isArray(badges)) {
    badgesJson = JSON.stringify(badges);
  } else if (typeof badges === 'string') {
    try {
      badgesJson = JSON.stringify(JSON.parse(badges));
    } catch {
      badgesJson = JSON.stringify(badges.split(',').map(s => s.trim()).filter(Boolean));
    }
  }

  let pNum = player_number;
  if (!pNum) {
    const count = get('SELECT COUNT(*) as c FROM players').c;
    pNum = `SAG-${String(count + 1).padStart(3, '0')}`;
  }

  run(`
    INSERT INTO players (
      id, player_number, name, photo_url, primary_position, secondary_positions,
      base_price, age, jersey_number, nationality, preferred_foot, height,
      biography, overall_rating, futbin_rating, speed_rating, shooting_rating, passing_rating,
      dribbling_rating, defensive_rating, physical_rating, category, card_style, badges, club, is_shortlisted
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `, [
    playerId, pNum, name, photoUrl, primary_position, secPos,
    parseInt(base_price, 10), age ? parseInt(age, 10) : 24,
    jersey_number ? parseInt(jersey_number, 10) : null,
    nationality || 'India', preferred_foot || 'Right', height || '',
    biography || '', overall_rating ? parseInt(overall_rating, 10) : 75,
    futbin_rating ? parseFloat(futbin_rating) : 77.8,
    speed_rating ? parseInt(speed_rating, 10) : 70,
    shooting_rating ? parseInt(shooting_rating, 10) : 70,
    passing_rating ? parseInt(passing_rating, 10) : 70,
    dribbling_rating ? parseInt(dribbling_rating, 10) : 70,
    defensive_rating ? parseInt(defensive_rating, 10) : 70,
    physical_rating ? parseInt(physical_rating, 10) : 70,
    category || 'standard', card_style || 'standard', badgesJson,
    club || 'SAG FC', is_shortlisted !== undefined ? (is_shortlisted ? 1 : 0) : 1
  ]);

  const created = get('SELECT * FROM players WHERE id = ?', [playerId]);
  res.status(201).json(created);
});

// PUT /api/players/:id - Update player attributes (Auctioneer & Super Admin)
router.put('/:id', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  const player = get('SELECT * FROM players WHERE id = ?', [req.params.id]);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const {
    name, player_number, primary_position, secondary_positions, photo_scale, photo_x, photo_y,
    base_price, age, jersey_number, nationality, preferred_foot,
    height, biography, overall_rating, futbin_rating, speed_rating, shooting_rating,
    passing_rating, dribbling_rating, defensive_rating, physical_rating,
    category, card_style, badges, auction_status, club, is_shortlisted
  } = req.body;

  let photoUrl = player.photo_url;
  if (req.file) {
    photoUrl = `/uploads/players/${req.file.filename}`;
  } else if (req.body.photo_url !== undefined) {
    photoUrl = req.body.photo_url || null;
  }

  let secPos = undefined;
  if (secondary_positions !== undefined) {
    secPos = Array.isArray(secondary_positions) ? JSON.stringify(secondary_positions) : String(secondary_positions);
  }

  let badgesJson = undefined;
  if (badges !== undefined) {
    badgesJson = Array.isArray(badges) ? JSON.stringify(badges) : String(badges);
  }

  const photoScale = photo_scale !== undefined && Number.isFinite(Number(photo_scale)) ? Number(photo_scale) : null;
  const photoX = photo_x !== undefined && Number.isFinite(Number(photo_x)) ? Number(photo_x) : null;
  const photoY = photo_y !== undefined && Number.isFinite(Number(photo_y)) ? Number(photo_y) : null;

  run(`
    UPDATE players SET
      name = COALESCE(?, name),
      player_number = COALESCE(?, player_number),
      photo_url = ?,
      photo_scale = COALESCE(?, photo_scale),
      photo_x = COALESCE(?, photo_x),
      photo_y = COALESCE(?, photo_y),
      primary_position = COALESCE(?, primary_position),
      secondary_positions = COALESCE(?, secondary_positions),
      base_price = COALESCE(?, base_price),
      age = COALESCE(?, age),
      jersey_number = COALESCE(?, jersey_number),
      nationality = COALESCE(?, nationality),
      preferred_foot = COALESCE(?, preferred_foot),
      height = COALESCE(?, height),
      biography = COALESCE(?, biography),
      overall_rating = COALESCE(?, overall_rating),
      futbin_rating = COALESCE(?, futbin_rating),
      speed_rating = COALESCE(?, speed_rating),
      shooting_rating = COALESCE(?, shooting_rating),
      passing_rating = COALESCE(?, passing_rating),
      dribbling_rating = COALESCE(?, dribbling_rating),
      defensive_rating = COALESCE(?, defensive_rating),
      physical_rating = COALESCE(?, physical_rating),
      category = COALESCE(?, category),
      card_style = COALESCE(?, card_style),
      badges = COALESCE(?, badges),
      auction_status = COALESCE(?, auction_status),
      club = COALESCE(?, club),
      is_shortlisted = COALESCE(?, is_shortlisted),
      updated_at = datetime('now')
    WHERE id = ?
  `, [
    name, player_number, photoUrl, photoScale, photoX, photoY, primary_position, secPos,
    base_price ? parseInt(base_price, 10) : null,
    age ? parseInt(age, 10) : null,
    jersey_number ? parseInt(jersey_number, 10) : null,
    nationality, preferred_foot, height, biography,
    overall_rating ? parseInt(overall_rating, 10) : null,
    futbin_rating ? parseFloat(futbin_rating) : null,
    speed_rating ? parseInt(speed_rating, 10) : null,
    shooting_rating ? parseInt(shooting_rating, 10) : null,
    passing_rating ? parseInt(passing_rating, 10) : null,
    dribbling_rating ? parseInt(dribbling_rating, 10) : null,
    defensive_rating ? parseInt(defensive_rating, 10) : null,
    physical_rating ? parseInt(physical_rating, 10) : null,
    category, card_style, badgesJson, auction_status, club,
    is_shortlisted !== undefined ? (is_shortlisted ? 1 : 0) : null,
    player.id
  ]);

  // Broadcast state
  if (req.app.get('io')) {
    const { getFullAuctionState } = require('../services/auction');
    req.app.get('io').emit('auction:state', getFullAuctionState());
  }

  const updated = get('SELECT * FROM players WHERE id = ?', [player.id]);
  res.json(updated);
});

// DELETE /api/players/:id - Delete unsold player
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const player = get('SELECT * FROM players WHERE id = ?', [req.params.id]);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (player.auction_status === 'sold') {
    return res.status(400).json({ error: 'Cannot delete a sold player' });
  }

  run('DELETE FROM players WHERE id = ?', [player.id]);
  res.json({ success: true, message: 'Player removed successfully' });
});

// POST /api/players/import - CSV Bulk Import
router.post('/import', authenticate, requireAdmin, (req, res) => {
  const { csvData } = req.body;
  if (!csvData) {
    return res.status(400).json({ error: 'CSV data is required' });
  }

  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let importedCount = 0;
    transaction(() => {
      for (const row of records) {
        if (!row.name || !row.primary_position) continue;

        const id = uuidv4();
        const count = get('SELECT COUNT(*) as c FROM players').c;
        const pNum = row.player_number || `SAG-${String(count + 1).padStart(3, '0')}`;
        const basePrice = parseInt(row.base_price, 10) || 10000;

        exec(`
          INSERT INTO players (
            id, player_number, name, primary_position, base_price,
            age, nationality, overall_rating, category, card_style, is_shortlisted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          id, pNum, row.name, row.primary_position, basePrice,
          row.age ? parseInt(row.age, 10) : 24,
          row.nationality || 'India',
          row.overall_rating ? parseInt(row.overall_rating, 10) : 75,
          row.category || 'standard',
          row.card_style || 'standard'
        ]);
        importedCount++;
      }
    });

    res.json({ success: true, count: importedCount });
  } catch (err) {
    res.status(400).json({ error: 'CSV parsing failed: ' + err.message });
  }
});

module.exports = router;
