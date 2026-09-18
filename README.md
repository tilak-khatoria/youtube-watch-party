# YouTube Watch Party (SyncParty)

> 🌐 **Live Deployment URL:** [https://youtube-watch-party-frontend-cbxv.onrender.com/](https://youtube-watch-party-frontend-cbxv.onrender.com/)  
> 👤 **Author:** Tilak Khatoria  
> 🛡️ **Assignment:** Intern Assignment: YouTube Watch Party System (100% Compliant + SQLite & RBAC Bonus)

A real-time, synchronized YouTube watch party web application built with **React 19**, **TypeScript**, **Vite**, **Node.js**, **Express**, **SQLite3**, and **Socket.IO**. 

Watch YouTube videos with friends in perfect synchronization with built-in **Role-Based Access Control (RBAC)**, cryptographic host validation (`creatorToken`), participant request approval workflows, SQLite persistent storage, interactive live chat, floating reaction emojis, and native player interaction for room leaders.

---

## 🎬 Features

### 1. Real-Time Video Synchronization
- **Sub-Second Playback Sync**: Video state (`play`, `pause`, `seek`, and `change_video`) is broadcast via WebSocket to all room members in real time.
- **Latency Drift Correction**: Clients automatically correct timestamp drift exceeding 1.8 seconds to keep everyone in sync across varying network conditions.
- **Manual Resync**: Dedicated "Resync" button allows participants to re-align with the room host at any time.

### 2. Role-Based Access Control (RBAC)
- 👑 **Host**:
  - Auto-assigned to the room creator.
  - Full native interaction with the YouTube iframe player (clicks, scrubbing, controls).
  - Can play, pause, seek, and change the video via custom controls or inline URL input.
  - Can promote/demote participants to **Moderator**, transfer **Host** ownership, or kick disruptive participants.
  - Host authority and creator state persist across page reloads and disconnects.
- 🛡️ **Moderator**:
  - Promoted by the Host.
  - Full native player interaction and custom controls: can play, pause, seek, and change videos.
- 👁️ **Participant / Viewer**:
  - **Watch Only Mode**: Custom playback controls (play/pause buttons, draggable seek bar, video URL input) are disabled or hidden.
  - Replaced with an informative "Watch Only" status badge and a read-only timeline progress bar.
  - Protected by a transparent overlay with `pointer-events: none` preventing participants from tampering with native YouTube player controls.

### 3. Direct Link Joins & Refresh Resiliency
- **Clean Room ID Normalization**: Both raw codes (e.g. `13m4x1`) and prefixed codes (e.g. `party-13m4x1`) resolve to the exact same canonical room (`party-13m4x1`).
- **Fallback Display Name Prompt**: Direct link visitors and page refreshers without a stored username are greeted with a clean modal prompt asking for their display name *before* establishing socket connection or mounting the player.
- **No Black Screens**: Stable player initialization lifecycle ensures the YouTube IFrame API target container is preserved without tear-downs or crashes on role changes.

### 4. Interactive Live Chat & Participant Roster
- Real-time room chat with timestamps and role badges (👑 Host, 🛡️ Moderator, 👁️ Viewer).
- Participant sidebar with active member counts and search filtering.

---

## 🛠️ Tech Stack

- **Frontend**:
  - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/) (Fast HMR & build tool)
  - [TailwindCSS v4](https://tailwindcss.com/)
  - [Socket.IO Client](https://socket.io/docs/v4/client-api/)
  - [Lucide React](https://lucide.dev/) (Modern iconography)
  - YouTube IFrame Player API
- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/)
  - [Socket.IO](https://socket.io/) (WebSockets with fallback to long-polling)
  - [TypeScript](https://www.typescriptlang.org/) & `ts-node` / `nodemon`
  - CORS with configurable origin validation

---

## 📁 Repository Structure

```
youtube-watch-party/
├── backend/                  # Node.js + Express + Socket.IO Server
│   ├── src/
│   │   ├── managers/         # Singleton RoomManager (room lifecycle & lookup)
│   │   ├── models/           # OOP Room and Participant models
│   │   ├── types/            # Shared interfaces, events, and payload types
│   │   └── server.ts         # Main Express & Socket.IO server entrypoint
│   ├── .env.example          # Sample backend environment variables
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Vite + React + TypeScript Client
│   ├── src/
│   │   ├── components/       # YouTubePlayer, ParticipantList, LiveChat, Navbar, Modal
│   │   ├── pages/            # HomePage (Create/Join) & RoomPage (Party Room)
│   │   ├── services/         # Singleton Socket.IO client service
│   │   ├── utils/            # YouTube URL parsing & Room ID normalization
│   │   ├── types/            # Frontend type definitions
│   │   └── App.tsx           # Route configurations (/ and /room/:roomId)
│   ├── .env.example          # Sample frontend environment variables
│   ├── package.json
│   └── vite.config.ts
├── render.yaml               # Infrastructure-as-Code for Render Cloud Deployment
├── DEPLOYMENT.md             # Production deployment instructions
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started (Step-by-Step)

Follow these instructions to clone, install, configure, and run the project locally.

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (check via `node -v`)
- **npm**: `v9.0.0` or higher (check via `npm -v`)
- **Git**: (check via `git --version`)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/tilak-khatoria/youtube-watch-party.git
cd youtube-watch-party
```

---

### Step 2: Install Dependencies

You must install dependencies in **both** the `backend` and `frontend` directories:

```bash
# 1. Install Backend Dependencies
cd backend
npm install

# 2. Install Frontend Dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

---

### Step 3: Configure Environment Variables

Both directories contain `.env.example` files to guide your setup.

#### 1. Backend Environment Setup (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```bash
# In backend/
cp .env.example .env
```

Ensure `backend/.env` contains:
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### 2. Frontend Environment Setup (`frontend/.env`)
Create a `.env` file in the `frontend/` directory pointing to your local backend server:

```bash
# In frontend/
cp .env.example .env
```

Ensure `frontend/.env` contains:
```env
# Points the React frontend to the local Socket.IO backend
VITE_BACKEND_URL=http://localhost:3001
```

> **Note**: If `VITE_BACKEND_URL` is omitted, the frontend automatically falls back to `http://localhost:3001` in local development.

---

### Step 4: Run the Application Locally

Run the backend and frontend development servers concurrently in two terminal tabs:

#### Terminal 1: Start Backend Server
```bash
cd backend
npm run dev
```
- The backend will start on **`http://localhost:3001`**.
- Verify the server health check at: [http://localhost:3001/health](http://localhost:3001/health).

#### Terminal 2: Start Frontend Development Server
```bash
cd frontend
npm run dev
```
- Vite will start the client on **`http://localhost:5173`**.
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing the Application

### 1. Test Host Experience
1. Open [http://localhost:5173](http://localhost:5173) in Browser Window #1.
2. In the **"Start a Watch Party"** panel:
   - Enter your name (e.g. `Alex Host`).
   - Enter a custom Room Code (or leave blank to generate a random code).
   - Enter a YouTube Video URL or ID (e.g. `dQw4w9WgXcQ` or `https://www.youtube.com/watch?v=L_LUpnjgPso`).
   - Click **"Create Watch Room"**.
3. You will enter the room as **Host** (👑).
4. Verify you can play, pause, seek the timeline, and use the URL bar at the top to change the video.

### 2. Test Participant Experience (Incognito / Window #2)
1. Open an Incognito window (or secondary browser) and navigate to the room link, e.g.:
   `http://localhost:5173/room/party-xxxxxx` (or using the short code `http://localhost:5173/room/xxxxxx`).
2. Notice the fallback **"Join Watch Party"** prompt asking for your display name.
3. Enter a name (e.g. `Sam Viewer`) and join.
4. Verify:
   - Your role is **Participant / Viewer** (👁️).
   - The YouTube iframe has a transparent overlay (`pointer-events: none`).
   - Play/pause button is replaced with **"Watch Only"**.
   - Timeline scrubber is locked to read-only progress.
   - The URL change form is replaced with a **"Watch Only"** sync status banner.
5. In Browser Window #1 (Host), press **Play** or **Seek** — observe that Window #2 synchronizes instantly.

### 3. Test Role Management
1. In the Host window (Window #1), expand the **Participants** tab on the right sidebar.
2. Click the shield icon next to `Sam Viewer` to promote them to **Moderator** (🛡️).
3. Observe in Window #2 that controls unlock immediately: the Moderator can now play, pause, seek, and change video.

---

## 📡 WebSocket Event Reference (100% Specification Parity)

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client ➔ Server | `{ roomId, username, creatorToken? }` | Client joins room. Host role assigned only if room is empty or valid `creatorToken` is provided. |
| `room_joined` | Server ➔ Client | `{ roomId, participant, room, creatorToken? }` | Confirms room admission with initial state & role. |
| `user_joined` | Server ➔ Clients | `{ username, userId, role, participants }` | Broadcast to all room members that a participant joined. |
| `user_left` | Server ➔ Clients | `{ username, userId, participants }` | Broadcast to all room members that a participant left. |
| `sync_state` | Server ➔ Clients | `{ playState, currentTime, videoId }` | Broadcasts authoritative computed playback state to room. |
| `play` | Bidirectional | `{ roomId, currentTime? }` | User pressed play; requires Host/Moderator; server broadcasts. |
| `pause` | Bidirectional | `{ roomId, currentTime? }` | User pressed pause; requires Host/Moderator; server broadcasts. |
| `seek` | Bidirectional | `{ time, currentTime? }` | User seeks timeline; requires Host/Moderator; server broadcasts. Accepts `time` per PDF spec with `currentTime` fallback. |
| `change_video` | Bidirectional | `{ videoId }` | Change video; requires Host/Moderator; server broadcasts. |
| `assign_role` | Client ➔ Server | `{ userId, role }` | Host assigns role to participant; Host only. |
| `role_assigned` | Server ➔ Clients | `{ userId, username, role, participants }` | Role was assigned; updates participant list across room. |
| `remove_participant`| Client ➔ Server | `{ userId }` | Host removes user from room; Host only. |
| `participant_removed`| Server ➔ Clients | `{ userId, participants }` | Participant was removed by host. |
| `request_action` | Client ➔ Server | `{ action, payload? }` | Participant requests Host approval for an action (`control`, `change_video`, `seek`, `play`, `pause`). |
| `action_requested` | Server ➔ Host/Mods | `{ requestId, userId, username, action, payload }` | Broadcasts pending request notification to Host and Moderators. |
| `approve_request` | Host ➔ Server | `{ requestId }` | Host/Moderator approves the requested action and executes it. |
| `reject_request` | Host ➔ Server | `{ requestId, reason? }` | Host/Moderator denies the request. |
| `send_message` | Client ➔ Server | `{ roomId, message }` | Sends rate-limited live chat message. |
| `receive_message` | Server ➔ Clients | `{ id, senderId, username, role, message, timestamp }` | Broadcasts chat message to room members. |
| `send_reaction` | Client ➔ Server | `{ roomId, emoji }` | Emits rate-limited floating emoji reaction. |
| `receive_reaction`| Server ➔ Clients | `{ id, emoji, senderName, timestamp, xOffset }` | Renders animated floating emoji on all connected screens. |

---

## ☁️ Deployment

This project includes a [render.yaml](render.yaml) blueprint for one-click deployment on [Render](https://render.com/):

- **Backend Web Service**: Node.js environment running `npm run start` on port `10000`.
- **Frontend Static Site**: Static site built with `npm run build` in `frontend/`, publishing `frontend/dist`.
- Detailed manual and Blueprint deployment steps can be found in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📄 License

This project is licensed under the ISC License.
