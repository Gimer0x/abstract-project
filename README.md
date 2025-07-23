# Document Summarizer

A modern web application that processes documents and generates AI-powered summaries using OpenAI's GPT-4 model.

## 🚀 Features

- **Multi-format Support**: PDF, TXT, DOCX, RTF, ODT
- **AI-Powered Summarization**: Uses OpenAI GPT-4 for intelligent document analysis
- **Information Extraction**: Key points, action items, dates, names, places
- **Multiple Export Formats**: PDF, DOCX, TXT with professional formatting
- **Modern UI**: Responsive design with drag-and-drop functionality
- **Real-time Processing**: Progress indicators and status updates
- **Copy to Clipboard**: One-click text copying

## 📋 Requirements

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Modern web browser

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Abstract
```

### 2. Backend Setup
```bash
cd backend
npm install
cp env.example .env
```

Edit `.env` file and add your OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Start the Application

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
│   │   ├── App.js
│   │   └── App.css
│   ├── package.json
│   └── README.md
├── requirements_document.md
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment (development/production)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 5MB)

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5001)

## 📖 Usage

1. **Upload Document**: Drag and drop or click to select a document
2. **Processing**: Wait for AI analysis (progress indicator shown)
3. **Review Summary**: View executive summary and extracted information
4. **Export**: Download in PDF, DOCX, or TXT format
5. **Copy**: Use the copy button to copy summary text

## 🔌 API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /api/process-document` - Upload and process document
- `POST /api/export/pdf` - Export as PDF
- `POST /api/export/docx` - Export as DOCX
- `POST /api/export/txt` - Export as TXT

## 🎨 Features in Detail

### Document Processing
- **File Validation**: Size and type checking
- **Text Extraction**: Format-specific parsing
- **AI Analysis**: GPT-4 powered summarization
- **Information Extraction**: Structured data extraction

### User Interface
- **Drag & Drop**: Intuitive file upload
- **Progress Indicators**: Real-time processing status
- **Responsive Design**: Works on all devices
- **Toast Notifications**: User feedback

### Export Options
- **PDF**: Professional formatting with headers
- **DOCX**: Microsoft Word compatible
- **TXT**: Plain text with structured formatting
- **Copy**: Clipboard integration

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

## 🔒 Security Considerations

- Files are automatically deleted after processing
- No persistent storage of uploaded documents
- Environment variables for sensitive data
- File type and size validation
- CORS configuration for API access

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure internet connection

2. **File Upload Issues**
   - Check file size (max 5MB)
   - Verify supported file types
   - Check browser console for errors

3. **Backend Connection**
   - Ensure backend server is running
   - Check port configuration
   - Verify CORS settings

4. **Export Issues**
   - Check file permissions
   - Verify download settings
   - Ensure sufficient disk space

## 📝 Development

### Adding New Features

1. **Backend**: Add new services in `backend/services/`
2. **Frontend**: Create new components in `frontend/src/components/`
3. **API**: Add new endpoints in `backend/server.js`
4. **Testing**: Test across different file types and sizes

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
- React and Node.js communities
- Open source contributors

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Open an issue on GitHub

---

**Note**: This is a test/development version. For production use, implement additional security measures and error handling. 