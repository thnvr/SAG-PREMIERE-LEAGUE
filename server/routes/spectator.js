/**
 * SAG PREMIERE LEAGUES - Spectator Comments & Chat Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { all, run } = require('../db/database');

// GET /api/spectator/comments - Get all spectator comments (never cleared)
router.get('/comments', (req, res) => {
  try {
    const comments = all(`
      SELECT id, display_name AS user, message AS text, created_at AS time, reaction
      FROM spectator_chat_messages
      ORDER BY created_at ASC, id ASC
    `);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve comments: ' + err.message });
  }
});

// POST /api/spectator/comments - Post a new comment
router.post('/comments', (req, res) => {
  const { text, reaction, user } = req.body;

  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText || trimmedText.length > 300) {
    return res.status(400).json({ error: 'Message must be between 1 and 300 characters' });
  }

  const senderName = typeof user === 'string' && user.trim() ? user.trim().slice(0, 32) : 'Spectator';
  const comment = {
    id: uuidv4(),
    user: senderName,
    text: trimmedText,
    time: new Date().toISOString(),
    reaction: typeof reaction === 'string' ? reaction.slice(0, 8) : '🔥'
  };

  try {
    run(
      'INSERT INTO spectator_chat_messages (id, display_name, message, reaction, created_at) VALUES (?, ?, ?, ?, ?)',
      [comment.id, comment.user, comment.text, comment.reaction, comment.time]
    );

    // Broadcast in real-time to all connected Socket.io clients
    const io = req.app.get('io');
    if (io) {
      io.emit('spectator:chat:message', comment);
    }

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save comment: ' + err.message });
  }
});

module.exports = router;
