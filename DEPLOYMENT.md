# SAG PREMIERE LEAGUES - Vercel & Production Deployment Guide

## 1. Quick Vercel Deployment (Frontend / Web Application)

The repository has been configured with [vercel.json](file:///C:/Users/thanveer/.gemini/antigravity/scratch/sag-premiere-leagues/vercel.json) to build the Vite client and route all paths to `client/dist`.

### Option A: Via Vercel Web Dashboard (Recommended & Easiest)
1. Push this folder to your GitHub / GitLab account:
   ```bash
   git init
   git add .
   git commit -m "feat: SAG Premiere Leagues release"
   git remote add origin https://github.com/<your-username>/sag-premiere-leagues.git
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)**.
3. Import your `sag-premiere-leagues` repository.
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (or keep root with `npm run client:build`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**. Your site will be live instantly with a `.vercel.app` URL!

---

### Option B: Via Vercel CLI Directly
In your terminal, run:
```bash
npx vercel
```
1. Follow the interactive prompts to link your Vercel account.
2. Select your scope and confirm project settings.
3. Once ready to publish to production:
   ```bash
   npx vercel --prod
   ```

---

## 2. Real-Time WebSocket & Backend Server Deployment

Because SAG PREMIERE LEAGUES uses real-time WebSockets (Socket.io) with an in-memory SQLite synchronization layer for real-time order-wise bidding and auctioneer lot nominations, the backend runs continuously as a stateful Node.js server.

You can host the Node server for free on **Render**, **Railway**, or **Fly.io**:

### Deploying the Backend on Render (1-Click Free Tier):
1. Create a **New Web Service** at [render.com](https://render.com).
2. Connect your GitHub repository.
3. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment Variable**: `PORT=3001`
4. Set your Vercel frontend environment variable:
   - `VITE_API_URL=https://<your-render-app>.onrender.com`
   - `VITE_WS_URL=https://<your-render-app>.onrender.com`

---

## 3. Running Locally

Both the backend and frontend are currently live and running:
- **Frontend**: [http://localhost:5173](http://localhost:5173) (Mobile responsive & tested)
- **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

### Test Accounts:
- **Super Admin**: `admin` / `admin123`
- **Auctioneer**: `auctioneer` / `auction123`
- **Team 1 Captain (Thunderbolts FC)**: `captain_tb` / `captain123`
- **Team 2 Captain (Red Phoenix SC)**: `captain_rp` / `captain123`
- **Team 3 Captain (Golden Eagles FC)**: `captain_ge` / `captain123`
