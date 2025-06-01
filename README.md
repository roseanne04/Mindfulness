# MindfulSpace Backend API

A Node.js backend API for the MindfulSpace mental health and wellness platform.

## Features

- User authentication (signup/login) with JWT
- Profile management
- Mood tracking with calendar integration
- Gratitude journaling
- Personal journal entries with categories
- Public journal sharing (support group)
- User connections and friend requests
- Statistics and analytics

## Setup Instructions

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Database Setup
Create a PostgreSQL database and run the schema:
\`\`\`bash
# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# Then run the schema
npm run db:setup
\`\`\`

### 3. Environment Variables
Configure your `.env` file with:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure secret for JWT tokens
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### 4. Start the Server
\`\`\`bash
# Development
npm run dev

# Production
npm start
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Mood Tracking
- `POST /api/moods` - Save mood entry
- `GET /api/moods` - Get user's mood history

### Gratitude
- `POST /api/gratitudes` - Save gratitude entry
- `GET /api/gratitudes` - Get gratitude entries

### Journal
- `POST /api/journal` - Create journal entry
- `GET /api/journal` - Get user's journal entries
- `DELETE /api/journal/:id` - Delete journal entry
- `GET /api/journal/public` - Get public journal entries

### Connections
- `GET /api/users` - Get other users for connections
- `POST /api/connections/request` - Send friend request
- `GET /api/connections/requests` - Get sent friend requests

### Statistics
- `GET /api/stats` - Get user statistics

## Frontend Integration

Update your frontend JavaScript to use the API:

\`\`\`javascript
// Example API calls
const API_BASE = 'your-api-url';

// Login
const response = await fetch(`${API_BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Authenticated requests
const token = localStorage.getItem('token');
const response = await fetch(`${API_BASE}/api/profile`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
\`\`\`

## Deployment

1. Set up PostgreSQL database on your hosting platform
2. Configure environment variables
3. Deploy the Node.js application
4. Update frontend to use your API URL

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection protection with parameterized queries
- CORS configuration
- Input validation and sanitization
