const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { processDocument } = require('./services/documentProcessor');
const { generateSummary } = require('./services/openaiService');
const { exportToPDF, exportToDOCX, exportToTXT } = require('./services/exportService');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.docx', '.rtf', '.odt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOCX, RTF, and ODT files are allowed.'), false);
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Document Summarizer API is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Document processing endpoint
app.post('/api/process-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.originalname);

    // Extract text from the uploaded document
    const extractedText = await processDocument(req.file.path, req.file.originalname);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the document' });
    }

    // Generate summary using OpenAI
    const summary = await generateSummary(extractedText);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      originalFilename: req.file.originalname,
      summary: summary
    });

  } catch (error) {
    console.error('Error processing document:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Error processing document',
      details: error.message 
    });
  }
});

// Export endpoints
app.post('/api/export/pdf', async (req, res) => {
  try {
    const { summaryData, originalFilename } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    const pdfBuffer = await exportToPDF(summaryData, originalFilename);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
});

app.post('/api/export/docx', async (req, res) => {
  try {
    const { summaryData, originalFilename } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    const docxBuffer = await exportToDOCX(summaryData, originalFilename);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.docx"`);
    res.send(docxBuffer);

  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ error: 'Error generating DOCX' });
  }
});

app.post('/api/export/txt', async (req, res) => {
  try {
    const { summaryData, originalFilename } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    const txtContent = await exportToTXT(summaryData, originalFilename);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.txt"`);
    res.send(txtContent);

  } catch (error) {
    console.error('TXT export error:', error);
    res.status(500).json({ error: 'Error generating TXT' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 