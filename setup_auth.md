# Authentication Setup Guide

This guide will help you set up Google OAuth authentication for the Document Summarizer application.

## Prerequisites

1. A Google account
2. MongoDB installed and running (or a MongoDB Atlas account)
3. Node.js and npm installed

## Step 1: Set up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:5001/auth/google/callback`
     - For production: `https://yourdomain.com/auth/google/callback`
5. Copy the Client ID and Client Secret

## Step 2: Set up MongoDB

### Option A: Local MongoDB
1. Install MongoDB on your system
2. Start the MongoDB service
3. Create a database named `document-summarizer`

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string

## Step 3: Configure Environment Variables

1. Copy `backend/env.example` to `backend/.env`
2. Fill in the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=5001
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=5242880

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/document-summarizer
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/document-summarizer

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
```

## Step 4: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 5: Start the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend application:
```bash
cd frontend
npm start
```

## Step 6: Test the Authentication

1. Open your browser and go to `http://localhost:3000`
2. Click "Sign In" in the header
3. Choose "Sign in with Google"
4. Complete the Google OAuth flow
5. You should be redirected back to the application and see your profile

## Features for Authenticated Users

- Access to all summary sizes (short, medium, long)
- Document history tracking
- Persistent login sessions
- User profile management

## Features for Guest Users

- Limited to short summaries only
- No document history
- No persistent sessions

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error**
   - Make sure the redirect URI in Google Cloud Console matches exactly
   - Check that the protocol (http/https) and port are correct

2. **MongoDB connection error**
   - Verify MongoDB is running
   - Check the connection string format
   - Ensure network access if using MongoDB Atlas

3. **CORS errors**
   - Verify FRONTEND_URL is set correctly in .env
   - Check that the frontend is running on the expected port

4. **JWT errors**
   - Ensure JWT_SECRET is set and is a strong, random string
   - Check that the token is being sent in the Authorization header

### Security Notes:

- Never commit your .env file to version control
- Use strong, random strings for JWT_SECRET and SESSION_SECRET
- In production, use HTTPS for all communications
- Regularly rotate your Google OAuth credentials
- Monitor your application logs for security issues

## Production Deployment

For production deployment:

1. Set NODE_ENV=production
2. Use HTTPS for all URLs
3. Set up proper CORS origins
4. Use a production MongoDB instance
5. Set up proper session storage (Redis recommended)
6. Configure proper logging and monitoring
7. Set up SSL certificates
8. Use environment-specific Google OAuth credentials 