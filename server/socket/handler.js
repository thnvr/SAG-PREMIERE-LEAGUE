/**
 * SAG PREMIERE LEAGUES - Real-Time Socket.io Handler
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../middleware/auth');
const { getFullAuctionState, placeBid } = require('../services/auction');
const { all, get, run } = require('../db/database');

function getChatHistory() {
  return all(`
    SELECT id, display_name AS user, message AS text, created_at AS time, reaction
    FROM spectator_chat_messages
    ORDER BY created_at ASC, id ASC
  `);
}

function setupSocketIO(io) {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      socket.user = { role: 'spectator', authenticated: false };
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'spectator' || (decoded.userId && decoded.userId.toString().startsWith('spectator-guest'))) {
        socket.user = {
          id: decoded.userId || 'spectator-guest',
          username: decoded.username || 'player',
          display_name: decoded.displayName || decoded.username || 'Spectator',
          role: 'spectator',
          authenticated: true
        };
        return next();
      }

      const user = get('SELECT id, username, display_name, role, team_id FROM users WHERE id = ?', [decoded.userId]);
      if (user) {
        socket.user = { ...user, authenticated: true };
      } else {
        socket.user = {
          id: decoded.userId || 'spectator-guest',
          username: decoded.username || 'Spectator',
          display_name: decoded.displayName || decoded.username || 'Spectator',
          role: decoded.role || 'spectator',
          authenticated: true
        };
      }
      next();
    } catch (err) {
      socket.user = { role: 'spectator', authenticated: false };
      next();
    }
  });

  io.on('connection', (socket) => {
    // All connected users join the chat room and receive full persistent comment history
    socket.join('spectator-chat');
    socket.emit('spectator:chat:history', getChatHistory());

    // Send full current state upon connection
    try {
      const state = getFullAuctionState();
      socket.emit('auction:state', state);
    } catch (err) {
      console.error('[Socket] Error sending initial state:', err.message);
    }

    // Captain / User submitting bid via WebSocket
    socket.on('bid:submit', async (data, callback) => {
      if (!socket.user?.id || !['captain', 'super_admin', 'auctioneer'].includes(socket.user.role)) {
        if (callback) callback({ error: 'Authentication required' });
        return;
      }

      try {
        const { teamId, amount } = data;
        const result = await placeBid({
          teamId,
          userId: socket.user.id,
          amount: parseInt(amount, 10)
        });

        // Broadcast to all connected clients
        io.emit('auction:bid', result.bid);
        io.emit('auction:state', result.state);

        // Anti-Inflation: Check if current highest bid is 2x or more of base price
        try {
          const currentPlayer = result.state?.currentPlayer;
          const currentBid = result.state?.session?.current_highest_bid || 0;
          const basePrice = currentPlayer?.base_price || 0;
          if (currentPlayer && basePrice > 0 && currentBid >= 2 * basePrice) {
            const biddingTeams = all(
              'SELECT DISTINCT team_id FROM bids WHERE session_id = ? AND player_id = ?',
              [result.state.session.id, currentPlayer.id]
            );
            const upcoming = all(
              "SELECT id, name, primary_position, base_price FROM players WHERE primary_position = ? AND status = 'upcoming' AND id != ? ORDER BY base_price ASC LIMIT 5",
              [currentPlayer.primary_position, currentPlayer.id]
            );
            io.emit('auction:double-price-alert', {
              playerId: currentPlayer.id,
              playerName: currentPlayer.name,
              position: currentPlayer.primary_position,
              basePrice,
              currentBid,
              biddingTeamIds: (biddingTeams || []).map(b => b.team_id),
              upcomingPlayers: upcoming || [],
              message: `⚠️ PRICE INFLATION WARNING: ${currentPlayer.name} bid has doubled from ${formatMoney(basePrice)} to ${formatMoney(currentBid)}! Losing bids may incur tax deductions. Consider alternative ${currentPlayer.primary_position} players upcoming.`
            });
          }
        } catch (alertErr) {
          console.error('[Socket] Double price alert check error:', alertErr);
        }

        if (callback) callback({ success: true, bid: result.bid });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // Request fresh state
    socket.on('auction:sync', () => {
      try {
        const state = getFullAuctionState();
        socket.emit('auction:state', state);
      } catch (err) {}
    });

    socket.on('spectator:chat:send', (payload, callback) => {
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text || text.length > 300) {
        if (callback) callback({ error: 'Message must be between 1 and 300 characters' });
        return;
      }

      const senderName = socket.user?.display_name || socket.user?.username || (typeof payload?.user === 'string' && payload.user.trim()) || 'Spectator';

      const message = {
        id: uuidv4(),
        user: senderName,
        text,
        time: new Date().toISOString(),
        reaction: typeof payload?.reaction === 'string' && payload.reaction ? payload.reaction.slice(0, 8) : '🔥'
      };

      try {
        run(
          'INSERT INTO spectator_chat_messages (id, display_name, message, reaction, created_at) VALUES (?, ?, ?, ?, ?)',
          [message.id, message.user, message.text, message.reaction, message.time]
        );
      } catch (err) {
        if (callback) callback({ error: 'Unable to save message. Please try again.' });
        return;
      }

      // Broadcast comment in real time to everyone (spectators, captains, all users)
      io.emit('spectator:chat:message', message);
      if (callback) callback({ success: true, message });
    });

    socket.on('spectator:chat:sync', () => {
      socket.emit('spectator:chat:history', getChatHistory());
    });

    socket.on('disconnect', () => {});
  });

  // Countdown heartbeat every 1 second: Broadcast authoritative time remaining
  setInterval(() => {
    try {
      const session = get("SELECT countdown_end_time, bidding_status FROM auction_sessions WHERE status = 'active' AND bidding_status = 'open' LIMIT 1");
      if (session && session.countdown_end_time) {
        const remaining = Math.max(0, Math.ceil((new Date(session.countdown_end_time).getTime() - Date.now()) / 1000));
        io.emit('auction:countdown', { remaining, endTime: session.countdown_end_time });
      }
    } catch (err) {}
  }, 1000);
}

module.exports = { setupSocketIO };
