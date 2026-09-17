# 🚀 Production Deployment Guide: YouTube Watch Party

This guide details how to deploy the **YouTube Watch Party** full-stack application (React + Node.js/Express + Socket.IO) to **Render** with public URLs, live WebSockets, and CORS configured.

---

## 🏗️ Architecture Overview

| Service | Type | Root Directory | Build Command | Start / Publish |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Render Web Service (Node) | `backend` | `npm install && npm run build` | `npm start` |
| **Frontend** | Render Static Site | `frontend` | `npm install && npm run build` | `dist` |

---

## ⚡ Option 1: Automatic Blueprint Deployment (Recommended)

Render can automatically build and link both services using the included [`render.yaml`](./render.yaml) blueprint.

1. Push your project to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your repository.
5. Render will automatically detect `render.yaml` and configure:
   - `youtube-watch-party-backend` (Node Web Service)
   - `youtube-watch-party-frontend` (Static Site with SPA rewrite rules)
   - Auto-linked environment variables (`VITE_BACKEND_URL` & `FRONTEND_URL`)
6. Click **Apply**. Both services will build and deploy automatically!

---

## 🛠️ Option 2: Manual Deployment on Render

If you prefer setting up services individually:

### Step 1: Deploy Backend (Web Service)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `youtube-watch-party-backend`
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. In **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (or leave default assigned by Render)
   - `FRONTEND_URL` = `https://<YOUR-FRONTEND-NAME>.onrender.com` (Add once frontend is created, or leave `*` for initial deploy)
5. Click **Create Web Service**. Note down the public URL (e.g. `https://youtube-watch-party-backend.onrender.com`).

---

### Step 2: Deploy Frontend (Static Site)
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect the same repository.
3. Configure the settings:
   - **Name**: `youtube-watch-party-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_BACKEND_URL` = `https://<YOUR-BACKEND-NAME>.onrender.com` (Use the backend URL from Step 1)
5. In **Redirects / Rewrites** (or via `_redirects` file):
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express & Socket.IO | `3001` or `10000` |
| `FRONTEND_URL` | Allowed client origin(s) for CORS | `https://youtube-watch-party-frontend.onrender.com` |
| `NODE_ENV` | Runtime environment | `production` |

### Frontend (`frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | WebSocket & REST API backend URL | `https://youtube-watch-party-backend.onrender.com` |

---

## 🧪 Post-Deployment Verification Checklist

Once deployed, verify the system:

1. **Backend Health Check**:
   ```bash
   curl https://<YOUR-BACKEND-URL>/health
   # Expected response: {"status":"ok","service":"YouTube Watch Party Server",...}
   ```

2. **Frontend Public Access**:
   - Open `https://<YOUR-FRONTEND-URL>` in a web browser.
   - Verify that the connection indicator shows **"Live Sync Engine Ready"**.

3. **Room Creation & Sync Testing**:
   - Click **"Create & Launch Party"**.
   - Copy the room invite link and open it in a secondary device or incognito window.
   - Test that the creator receives **Host** authority, the second tab receives **Viewer** mode, and playback/pause/seek synchronizes in real time.
