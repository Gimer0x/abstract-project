# Document Summarizer

A modern web application that processes documents and generates AI-powered summaries using OpenAI's GPT-4 model, with user authentication and document history tracking.

## 🚀 Features

- **Multi-format Support**: PDF, TXT, DOCX, RTF, ODT
- **AI-Powered Summarization**: Uses OpenAI GPT-4 for intelligent document analysis
- **Customizable Summary Size**: Choose between short (1 paragraph), medium (3 paragraphs), or large (5 paragraphs) summaries
- **Information Extraction**: Key points, action items, dates, names, places
- **Multiple Export Formats**: PDF, DOCX, TXT with professional formatting
- **Modern UI**: Responsive design with drag-and-drop functionality
- **Real-time Processing**: Progress indicators and status updates
- **Copy to Clipboard**: One-click text copying
- **🔐 User Authentication**: Google OAuth integration for secure access
- **📚 Document History**: Track and view your previously processed documents
- **👤 User Profiles**: Personalized experience with user information
- **🔒 Guest Mode**: Limited access for non-authenticated users

## 📋 Requirements

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- MongoDB (local or Atlas)
- Google OAuth credentials
- Modern web browser

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Abstract
```

### 2. Set up Authentication
Follow the detailed setup guide in [setup_auth.md](setup_auth.md) to configure:
- Google OAuth credentials
- MongoDB database
- Environment variables

### 3. Backend Setup
```bash
cd backend
npm install
cp env.example .env
```

Edit `.env` file with all required variables (see setup_auth.md for complete list):
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/document-summarizer

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## 📁 Project Structure

```
Abstract/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB models
│   │   ├── User.js
│   │   └── Document.js
│   ├── middleware/         # Authentication middleware
│   │   └── auth.js
│   ├── routes/             # API routes
│   │   └── auth.js
│   ├── config/             # Configuration files
│   │   └── passport.js
│   ├── services/           # Business logic services
│   │   ├── documentProcessor.js
│   │   ├── openaiService.js
│   │   └── exportService.js
│   ├── server.js           # Main server file
│   ├── package.json
│   └── README.md
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── LoginButton.js
│   │   │   ├── UserProfile.js
│   │   │   └── DocumentHistory.js
│   │   ├── context/        # React context
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   └── App.css
│   ├── package.json
│   └── README.md
├── setup_auth.md           # Authentication setup guide
├── requirements_document.md
└── README.md
```

## �� Configuration

### Environment Variables

**Backend (.env):**
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `MONGODB_URI` - MongoDB connection string (required)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required)
- `JWT_SECRET` - JWT signing secret (required)
- `SESSION_SECRET` - Session secret (required)
- `FRONTEND_URL` - Frontend URL for CORS and redirects
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment (development/production)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 5MB)

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5001)

## 📖 Usage

### For Authenticated Users:
1. **Sign In**: Click "Sign In" and authenticate with Google
2. **Select Summary Size**: Choose short, medium, or large summary
3. **Upload Document**: Drag and drop or click to select a document
4. **Processing**: Wait for AI analysis (progress indicator shown)
5. **Review Summary**: View executive summary and extracted information
6. **Export**: Download in PDF, DOCX, or TXT format
7. **History**: View your document history in the sidebar
8. **Profile**: Access your profile and sign out

### For Guest Users:
1. **Continue as Guest**: Click "Continue as Guest" (limited to short summaries)
2. **Upload Document**: Drag and drop or click to select a document
3. **Processing**: Wait for AI analysis
4. **Review Summary**: View short summary only
5. **Export**: Download in PDF, DOCX, or TXT format

## 🔌 API Endpoints

### Authentication Endpoints
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/profile` - Get user profile (authenticated)
- `GET /auth/documents` - Get user's documents (authenticated)
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Document Processing Endpoints
- `GET /health` - Health check
- `POST /api/process-document` - Upload and process document (optional auth)
- `GET /api/documents` - Get user's document history (authenticated)
- `POST /api/export/pdf` - Export as PDF
- `POST /api/export/docx` - Export as DOCX
- `POST /api/export/txt` - Export as TXT

## 🎨 Features in Detail

### Authentication System
- **Google OAuth**: Secure authentication with Google accounts
- **JWT Tokens**: Stateless authentication with token-based sessions
- **User Profiles**: Store and manage user information
- **Session Management**: Persistent login sessions

### Document Management
- **Document History**: Track all processed documents for authenticated users
- **User Association**: Link documents to specific users
- **Metadata Storage**: Store file information, summary size, and timestamps
- **Privacy**: Documents are only visible to their owners

### Document Processing
- **File Validation**: Size and type checking
- **Text Extraction**: Format-specific parsing
- **AI Analysis**: GPT-4 powered summarization
- **Information Extraction**: Structured data extraction
- **Authentication Restrictions**: Medium/long summaries require authentication

### User Interface
- **Drag & Drop**: Intuitive file upload
- **Progress Indicators**: Real-time processing status
- **Responsive Design**: Works on all devices
- **Toast Notifications**: User feedback
- **Authentication UI**: Login/logout flows
- **Document History**: Sidebar with document list
- **User Profile**: Profile dropdown with user info

### Export Options
- **PDF**: Professional formatting with headers
- **DOCX**: Microsoft Word compatible
- **TXT**: Plain text with structured formatting
- **Copy**: Clipboard integration

## 🔒 Security Features

- **OAuth 2.0**: Secure authentication with Google
- **JWT Tokens**: Stateless authentication
- **CORS Protection**: Configured for specific origins
- **File Validation**: Type and size restrictions
- **User Isolation**: Documents are user-specific
- **Session Security**: Secure session management
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
npm run build
npm start
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy build/ folder to your hosting service
```

### Production Considerations
- Set up HTTPS for all communications
- Use production MongoDB instance
- Configure proper CORS origins
- Set up monitoring and logging
- Use environment-specific OAuth credentials
- Implement rate limiting
- Set up backup strategies

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Issues**
   - Verify Google OAuth credentials
   - Check redirect URI configuration
   - Ensure JWT_SECRET is set
   - Check MongoDB connection

2. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure internet connection

3. **File Upload Issues**
   - Check file size (max 5MB)
   - Verify supported file types
   - Check browser console for errors

4. **Backend Connection**
   - Ensure backend server is running
   - Check port configuration
   - Verify CORS settings

5. **Database Issues**
   - Verify MongoDB is running
   - Check connection string format
   - Ensure network access for cloud databases

### Security Notes:
- Never commit .env files to version control
- Use strong, random strings for secrets
- Regularly rotate OAuth credentials
- Monitor application logs
- Implement proper error handling

## 📝 Development

### Adding New Features

1. **Backend**: Add new services in `backend/services/`
2. **Frontend**: Create new components in `frontend/src/components/`
3. **API**: Add new endpoints in `backend/server.js`
4. **Database**: Add new models in `backend/models/`
5. **Testing**: Test across different file types and sizes

### Code Style

- **Backend**: ES6+ JavaScript, async/await
- **Frontend**: React functional components, hooks
- **Styling**: CSS with modern features
- **Documentation**: JSDoc comments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google for OAuth 2.0
- MongoDB for database
- React and Node.js communities
- Open source contributors

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the authentication setup guide
3. Check the documentation
4. Open an issue on GitHub

---

**Note**: This application includes authentication features. For production use, implement additional security measures, proper error handling, and monitoring. 