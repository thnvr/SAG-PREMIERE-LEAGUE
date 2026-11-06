# ⚽ SAG PREMIERE LEAGUES - Official Football Player Auction Platform

A complete, professional, real-time sports auction platform inspired by elite football competitions, sports broadcasting graphics, and high-end management games.

---

## 🌟 Key Architecture & Features

1. **Brand & Visual Identity**:
   - Dark sports theme with Midnight Navy (`#0f172a`), Charcoal (`#1e293b`), Electric Green (`#22c55e`), and Gold highlights.
   - Distinctive team identity colors: **Team Alpha** (Green), **Team Bravo** (Blue), **Team Charlie** (Red).
   - High-end FIFA/FUT style player cards with multiple editions: Standard, Premium Pick, Star Player, Goalkeeper Wall, and Special Icon.
   - Animated **SOLD** broadcasting banner overlay with confetti effects.

2. **Server-Authoritative Real-Time Auction Engine**:
   - Concurrency locking with atomic transaction boundaries (`BEGIN IMMEDIATE ... COMMIT`).
   - Pure JS SQLite database (`sql.js`) with ACID transactions, zero native compilation required.
   - Real-time WebSocket synchronization with JWT token authorization via Socket.io.
   - Heartbeat countdown timer with automatic extension on late bids.

3. **Financial Consistency & Budget Ledger**:
   - All financial numbers stored as integers in **paise** (`₹100 = 10,000 paise`, `₹20,000 = 2,000,000 paise`).
   - Server-side available purse calculations reserving funds to meet mandatory squad minimums.
   - Immutable audit log and double-entry style budget ledger tracking every purchase, reversal, and adjustment.

4. **17 Comprehensive Interfaces**:
   - **Public Homepage**: League branding, competing franchises, active lot spotlight, recent transfers.
   - **Authentication Portal**: Role-based access with one-click demo credentials.
   - **Live Auction Room**: Center-stage lot card, animated countdown timer, three franchise purse meters, captain quick-bid buttons, auctioneer command desk, and real-time bid stream.
   - **Three-Team Captains Desk**: Consolidated financial overview with budget utilization bars and transfer feed.
   - **Tactical Pitch Squad Pages**: Football pitch layout grouping players into Goalkeepers, Defenders, Midfielders, and Forwards.
   - **Player Gallery**: Interactive catalog with grid and list views, search, position filters, and dossier inspect modals.
   - **Automatic Card Designer**: Preview all 5 card editions and export high-resolution PNG trading cards.
   - **Auction History & Ledger**: Auditable archive of all finalized sales.
   - **Auction Results & Standings**: Final squad lists, average transfer prices, and team purse remaining.
   - **Spectator Screen**: High-contrast, clean broadcast layout designed for projectors and large TVs with Fullscreen mode.
   - **Super Admin Dashboard**: Database-backed stats, position distribution, purse spend progress, and quick actions.
   - **Team Management**: Custom franchise budgets, team colors, and captain assignments.
   - **Player Registry**: Full player registration, CSV batch import, position and rating management.
   - **Auction Config & Queue**: Sequenced nomination queue and auction parameters.
   - **League Configuration**: Rule settings for countdown, timer extensions, and squad limits.
   - **Reports & Export Centre**: One-click verified CSV downloads (Teams, Players, Financials, Auction Summary).
   - **Audit Trail & Corrections**: Reversal procedure for mistaken hammer falls and dispute resolution.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+)
- npm

### 2. Setup & Database Seeding
```bash
# In project root:
cd C:\Users\thanveer\.gemini\antigravity\scratch\sag-premiere-leagues

# Initialize database schema & seed initial franchises and players
npm run setup
npm run seed
```

### 3. Start Development Servers
```bash
# Option A: Start both Backend and Frontend concurrently
npm run dev

# Option B: Run separately
# Terminal 1 - Backend Server (Port 3001)
npm run server

# Terminal 2 - Frontend Client (Port 5173)
cd client
npm run dev
```

Visit the application at: **`http://localhost:5173`**

---

## 🔑 Default Login Credentials

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | Full administrative control & audit rights |
| **Auctioneer** | `auctioneer` | `auction123` | Auction room controls (nominate, timer, hammer fall) |
| **Captain (Alpha)** | `captain_alpha` | `alpha123` | Bids for **Team Alpha** (Green franchise) |
| **Captain (Bravo)** | `captain_bravo` | `bravo123` | Bids for **Team Bravo** (Blue franchise) |
| **Captain (Charlie)** | `captain_charlie` | `charlie123` | Bids for **Team Charlie** (Red franchise) |

*Tip: Quick one-click login buttons are provided on the Login page for instant role switching during testing.*

---

## 🧪 Automated Test Suite

Run the full end-to-end integration and concurrency test suite:
```bash
node test_e2e.js
```
All 21 validation checks verify bidding concurrency, purse deductions, squad rules, role permissions, and transaction integrity.
