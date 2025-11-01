# Newar Admin Dashboard

Administrative dashboard for Newar Insights - Meeting Recordings Management System

## Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Library**: Ant Design 5
- **Admin Framework**: Refine.dev 4
- **Router**: React Router v6

## Features

- 📊 Dashboard with real-time statistics
- 🎥 Recording management (list, create, download)
- 🤖 Bot monitoring and control
- 👤 User management
- 🔑 API key authentication
- 📱 Responsive design

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The dashboard connects to:
- **API Gateway**: `http://localhost:8080` (recordings, public endpoints)
- **Admin API**: `http://localhost:8081` (users, admin operations)

Vite proxy is configured for seamless development.

## Authentication

The dashboard uses two types of API keys:

1. **User API Key** (`X-API-Key` header)
   - Format: `vxa_live_...`
   - Used for: Recordings, bot operations
   - Default: `vxa_live_e29279a023399e7b7a8286a3642aa913f51525bc`

2. **Admin API Key** (`X-Admin-API-Key` header)
   - Used for: User management, admin operations
   - Default: `admin_secret_change_me`

## Project Structure

```
admin/
├── src/
│   ├── pages/
│   │   ├── dashboard/     # Dashboard page
│   │   ├── recordings/    # Recording list & create
│   │   └── login.tsx      # Login page
│   ├── providers/
│   │   ├── dataProvider.ts   # API integration
│   │   └── authProvider.ts   # Authentication
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── index.html
├── vite.config.ts
└── package.json
```

## Available Pages

- `/` - Dashboard with statistics
- `/recordings` - List all recordings
- `/recordings/create` - Create new recording
- `/login` - Authentication page

## Environment Variables

No environment variables needed for development. API URLs are hardcoded for simplicity:
- API Gateway: `http://localhost:8080`
- Admin API: `http://localhost:8081`

For production, update URLs in:
- `src/providers/dataProvider.ts`
- `src/App.tsx`
- `vite.config.ts` (proxy)
