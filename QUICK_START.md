# Quick Start Guide

Get your Document Summarizer application running in 5 minutes!

## 🚀 Quick Setup

### 1. Prerequisites
- Node.js v14 or higher
- OpenAI API key

### 2. One-Command Setup
```bash
./setup.sh
```

### 3. Configure OpenAI API
Edit `backend/.env`:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 4. Start the Application
```bash
npm run dev
```

### 5. Open Your Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## 🎯 Test the Application

1. **Upload a Document**: Drag and drop a PDF, DOCX, TXT, RTF, or ODT file
2. **Wait for Processing**: Watch the progress indicator
3. **Review Summary**: See the AI-generated executive summary
4. **Export**: Download in PDF, DOCX, or TXT format
5. **Copy**: Use the copy button for quick text copying

## 📁 Supported File Types

- **PDF** (.pdf) - Adobe PDF documents
- **DOCX** (.docx) - Microsoft Word documents  
- **TXT** (.txt) - Plain text files
- **RTF** (.rtf) - Rich Text Format files
- **ODT** (.odt) - OpenDocument Text files

**Maximum file size**: 5MB

## 🔧 Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Edit `backend/.env` and add your API key
- Restart the backend server

**"File upload failed"**
- Check file size (max 5MB)
- Verify file type is supported
- Ensure backend server is running

**"Export not working"**
- Check browser download settings
- Ensure sufficient disk space
- Try a different export format

### Need Help?

1. Check the main README.md for detailed documentation
2. Review the troubleshooting section
3. Check browser console for error messages

## 🎉 You're Ready!

Your Document Summarizer is now running! Upload a document and see the AI magic in action. 