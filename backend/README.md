# Document Summarizer Backend

Backend server for the document processing and summarization application.

## Features

- File upload and processing (PDF, TXT, DOCX, RTF, ODT)
- Text extraction from various document formats
- OpenAI GPT-4 integration for document summarization
- Export functionality (PDF, DOCX, TXT)
- RESTful API endpoints

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp env.example .env
```

3. Configure environment variables in `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### Running the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health` - Check server status

### Document Processing
- **POST** `/api/process-document` - Upload and process a document
  - Body: `multipart/form-data` with `document` field
  - Returns: JSON with summary data

### Export Endpoints
- **POST** `/api/export/pdf` - Export summary as PDF
- **POST** `/api/export/docx` - Export summary as DOCX
- **POST** `/api/export/txt` - Export summary as TXT

## File Format Support

- **PDF** (.pdf) - Text extraction using pdf-parse
- **DOCX** (.docx) - Microsoft Word documents
- **TXT** (.txt) - Plain text files
- **RTF** (.rtf) - Rich Text Format files
- **ODT** (.odt) - OpenDocument Text files

## File Size Limits

- Maximum file size: 5MB
- Single file upload only
- No batch processing

## Error Handling

The API includes comprehensive error handling for:
- Invalid file types
- File size limits
- OpenAI API errors
- Document processing errors
- Export generation errors

## Development

### Project Structure
```
backend/
├── server.js              # Main server file
├── services/              # Business logic services
│   ├── documentProcessor.js
│   ├── openaiService.js
│   └── exportService.js
├── uploads/               # Temporary file storage
└── package.json
```

### Adding New Features

1. Create new service files in `services/` directory
2. Add new routes in `server.js`
3. Update error handling as needed
4. Test with appropriate file types

## Security Notes

- Files are automatically deleted after processing
- No persistent storage of uploaded documents
- Basic file type validation
- Environment variables for sensitive data

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Ensure your API key is correctly set in `.env`
   - Check if the key has sufficient credits

2. **File Upload Errors**
   - Verify file type is supported
   - Check file size is under 5MB
   - Ensure uploads directory exists

3. **Processing Errors**
   - Check if document contains extractable text
   - Verify OpenAI API is accessible
   - Review server logs for detailed error messages 