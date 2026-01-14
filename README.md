# Social Media Automation Platform

A comprehensive social media management platform similar to Sprout Social. Manage all your social media accounts from one unified dashboard with advanced features for engagement, publishing, analytics, and social listening.

## Features

### Unified Smart Inbox
- Aggregate messages, comments, and mentions from all connected platforms
- Sentiment analysis (positive, negative, neutral) for each message
- Filter by platform, message type, sentiment, or read status
- Reply directly from the unified inbox
- Auto-sync every 5 minutes

### Advanced Publishing
- Schedule posts across TikTok, Instagram, YouTube, and Facebook
- AI-powered optimal send time recommendations based on historical engagement
- Calendar view for content planning
- Draft management and post queue
- Duplicate posts across multiple platforms

### Robust Analytics and Reporting
- Overview dashboard with cross-platform metrics
- Platform-specific detailed analytics
- Post-level performance tracking
- Campaign-focused analytics with aggregated metrics
- Custom date range reports
- Engagement rate and follower growth tracking

### Social Listening
- Track keywords and topics across platforms
- Sentiment analysis on discovered content
- Trend identification with mention counts
- Competitor analysis capabilities
- Sentiment over time visualization

### Campaign Management
- Organize posts into campaigns
- Campaign-level analytics aggregation
- Status management (active, paused, completed)
- Track performance across campaign duration

## Tech Stack

- **Database**: PostgreSQL 16
- **Backend**: Python 3.11 with FastAPI
- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Containerization**: Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- API keys for the platforms you want to connect:
  - TikTok API Key
  - Instagram API Key (via Facebook Graph API)
  - YouTube Data API Key
  - Facebook API Key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd social-media-automation
```

2. Copy the environment example file and configure it:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your configuration:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=social_media_automation
POSTGRES_HOST=social-media-db
DATABASE_URL=postgresql://postgres:your_secure_password@social-media-db:5432/social_media_automation

SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

TIKTOK_API_KEY=your_tiktok_api_key
INSTAGRAM_API_KEY=your_instagram_api_key
YOUTUBE_API_KEY=your_youtube_api_key
FACEBOOK_API_KEY=your_facebook_api_key
```

## Running the Application

### Option 1: Run All Services Together
From the root directory:
```bash
docker compose up --build
```

### Option 2: Run Each Service Separately
Each service (database, backend, frontend) can be started independently. This is useful for development or when you want more control.

**Step 1: Start the Database**
```bash
cd DataBase
docker compose up --build -d
```

**Step 2: Start the Backend**
```bash
cd BackEnd
docker compose up --build -d
```

**Step 3: Start the Frontend**
```bash
cd FrontEnd/react-app
docker compose up --build -d
```

**Note**: When running separately, start the database first since the backend depends on it. All services communicate via the `social-media-network` Docker network.

### Stopping Services

**If running all together:**
```bash
docker compose down
```

**If running separately:**
```bash
# Stop each service from its directory
cd DataBase && docker compose down
cd BackEnd && docker compose down
cd FrontEnd/react-app && docker compose down
```

5. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
social-media-automation/
├── BackEnd/
│   ├── Docker/
│   │   └── Dockerfile
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # FastAPI route handlers
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic and external APIs
│   │   ├── config.py        # Configuration management
│   │   ├── database.py      # Database connection
│   │   └── main.py          # FastAPI application entry
│   └── requirements.txt
├── DataBase/
│   ├── Docker/
│   │   └── Dockerfile
│   └── init.sql             # Database schema
├── FrontEnd/
│   └── react-app/
│       ├── Docker/
│       │   └── Dockerfile
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── context/     # React context providers
│       │   ├── pages/       # Page components
│       │   ├── services/    # API client
│       │   └── styles/      # CSS styles
│       └── package.json
├── compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Platforms
- `GET /platforms/` - List connected platforms
- `POST /platforms/connect` - Connect a new platform
- `DELETE /platforms/{id}` - Disconnect a platform

### Publishing
- `GET /publishing/posts` - List scheduled posts
- `POST /publishing/posts` - Create new post
- `GET /publishing/optimal-times/{platform}` - Get optimal posting times
- `GET /publishing/calendar` - Get calendar view

### Inbox
- `GET /inbox/messages` - List inbox messages with filters
- `POST /inbox/messages/{id}/reply` - Reply to a message
- `PUT /inbox/messages/{id}/read` - Mark message as read

### Analytics
- `GET /analytics/overview` - Cross-platform analytics overview
- `GET /analytics/platform/{platform}` - Platform-specific analytics
- `GET /analytics/posts` - Post-level analytics
- `GET /analytics/campaigns/{id}` - Campaign analytics

### Social Listening
- `GET /listening/topics` - List tracked topics
- `POST /listening/topics` - Add new topic to track
- `GET /listening/results` - Get listening results
- `GET /listening/trends` - Get trend analysis

### Campaigns
- `GET /campaigns/` - List campaigns
- `POST /campaigns/` - Create campaign
- `GET /campaigns/{id}/summary` - Get campaign summary

## Development

To run in development mode with hot reloading:

```bash
docker compose up
```

The frontend and backend volumes are mounted, so changes will be reflected automatically.

## License

MIT License
