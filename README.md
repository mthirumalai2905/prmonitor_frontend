# GitHub PR Monitor frontend

React UI for the vanilla GitHub PR monitor.

Locally the Vite dev server proxies `/ws` to the FastAPI backend on port 8000.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

Keep the backend running on port 8000.

## Deploy

This repo is the frontend only. The GitHub webhook still needs the FastAPI backend.

On Vercel or Netlify:

1. Import `https://github.com/mthirumalai2905/prmonitor_frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set `VITE_WS_URL` to your public backend websocket, for example `wss://your-backend-host/ws`

Until the backend is deployed, the UI can connect to a local backend only.
