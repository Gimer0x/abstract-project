const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

// Import utilities
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/envValidator');
const {
  authLimiter,
  uploadLimiter,
  apiLimiter,
  validateDocumentUpload,
  validateExportRequest,
  handleValidationErrors,
  securityHeaders,
  validateFileUpload
} = require('./middleware/security');

// Import services and middleware
const { processDocument } = require('./services/documentProcessor');
const { generateSummary } = require('./services/openaiService');
const { exportToPDF, exportToDOCX, exportToTXT } = require('./services/exportService');
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { canUploadDocument, incrementUsage, checkSubscription, canAccessFeature } = require('./middleware/subscriptionAuth');
const Document = require('./models/Document');
const Subscription = require('./models/Subscription');

// Import passport configuration
require('./config/passport');

// Validate environment variables
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration with enhanced security
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'sessionId' // Change default session name
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(sanitizedName));
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

// Import routes
const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');

// Apply rate limiting to all routes
app.use(apiLimiter);

// Apply specific rate limiting to auth routes
app.use('/auth', authLimiter);

// Apply rate limiting to upload endpoints
app.use('/api/process-document', uploadLimiter);
app.use('/api/process-document-guest', uploadLimiter);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Document Summarizer API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.json(health);
});

// Auth routes
app.use('/auth', authRoutes);

// Billing routes
app.use('/billing', billingRoutes);

// Document processing endpoint for authenticated users with enhanced security
app.post('/api/process-document', 
  requireAuth, 
  canUploadDocument, 
  upload.single('document'),
  validateFileUpload,
  validateDocumentUpload,
  handleValidationErrors,
  async (req, res) => {
    try {
      logger.info(`Processing document: ${req.file.originalname} for user: ${req.user._id}`);

      // Extract text and page count from the uploaded document
      const documentData = await processDocument(req.file.path, req.file.originalname);
      
      if (!documentData.text || documentData.text.trim().length === 0) {
        logger.warn(`No text extracted from document: ${req.file.originalname}`);
        return res.status(400).json({ error: 'Could not extract text from the document' });
      }

      // Get summary size from request body (default to 'short')
      let summarySize = req.body.summarySize || 'short';
      
      // Check subscription plan for summary size restrictions
      if (req.subscription.plan === 'free' && summarySize === 'long') {
        summarySize = 'medium'; // Downgrade to medium for free users
        logger.info(`Downgraded summary size to medium for free user: ${req.user._id}`);
      }
      
      // Validate summary size
      const validSizes = ['short', 'medium', 'long'];
      if (!validSizes.includes(summarySize)) {
        return res.status(400).json({ error: 'Invalid summary size. Must be short, medium, or long.' });
      }

      // Generate summary using OpenAI
      const summary = await generateSummary(documentData.text, summarySize);

      // Save document to database (user is authenticated)
      const document = new Document({
        userId: req.user._id,
        originalFilename: req.file.originalname,
        summary: summary,
        summarySize: summarySize,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        fileSize: req.file.size,
        isAuthenticated: true
      });
      await document.save();

      // Increment usage with page count
      req.documentPageCount = documentData.pageCount;
      await incrementUsage(req, res, () => {});

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      logger.info(`Document processed successfully: ${req.file.originalname} for user: ${req.user._id}`);

      res.json({
        success: true,
        originalFilename: req.file.originalname,
        summary: summary,
        summarySize: summarySize,
        plan: req.subscription.plan,
        usage: req.usage
      });

    } catch (error) {
      logger.error(`Error processing document: ${error.message}`, { 
        userId: req.user._id, 
        filename: req.file?.originalname,
        stack: error.stack 
      });
      
      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        error: 'Error processing document',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Document processing endpoint for guest users with enhanced security
app.post('/api/process-document-guest', 
  upload.single('document'),
  validateFileUpload,
  async (req, res) => {
    try {
      logger.info(`Processing document (guest): ${req.file.originalname}`);

      // Extract text and page count from the uploaded document
      const documentData = await processDocument(req.file.path, req.file.originalname);
      
      if (!documentData.text || documentData.text.trim().length === 0) {
        logger.warn(`No text extracted from guest document: ${req.file.originalname}`);
        return res.status(400).json({ error: 'Could not extract text from the document' });
      }

      // Check page limit for guest users (max 2 pages)
      if (documentData.pageCount > 2) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        logger.warn(`Guest user attempted to upload document with ${documentData.pageCount} pages`);
        return res.status(400).json({ 
          error: 'Document too large for guest users',
          details: `Guest users can only process documents up to 2 pages. Your document has ${documentData.pageCount} pages. Please sign in to process larger documents.`,
          pageCount: documentData.pageCount,
          maxPages: 2
        });
      }

      // Guest users can only use short summaries
      const summarySize = 'short';
      
      // Generate summary using OpenAI
      const summary = await generateSummary(documentData.text, summarySize);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      logger.info(`Guest document processed successfully: ${req.file.originalname}`);

      res.json({
        success: true,
        originalFilename: req.file.originalname,
        summary: summary,
        summarySize: summarySize,
        plan: 'guest',
        pageCount: documentData.pageCount,
        requiresAuth: true, // Signal to frontend that auth is needed for more features
        message: 'Sign in to access medium and long summaries, export documents, and save your documents!'
      });

    } catch (error) {
      logger.error(`Error processing guest document: ${error.message}`, { 
        filename: req.file?.originalname,
        stack: error.stack 
      });
      
      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        error: 'Error processing document',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get user's document history with enhanced security
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
    logger.info(`Fetching documents for user: ${req.user._id}`);
    
    // Get user's subscription to determine document limit
    const subscription = await Subscription.findOne({ userId: req.user._id });
    const plan = subscription ? subscription.plan : 'free';
    
    // Set document limit based on plan
    let documentLimit = 50; // Default for premium/pro
    if (plan === 'free') {
      documentLimit = 5; // Free users see only last 5 documents
    }
    
    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(documentLimit);
    
    logger.info(`Retrieved ${documents.length} documents for user: ${req.user._id}`);
    res.json(documents);
  } catch (error) {
    logger.error(`Error fetching documents: ${error.message}`, { 
      userId: req.user._id,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Export endpoints with enhanced security
app.post('/api/export/pdf', 
  requireAuth, 
  checkSubscription, 
  validateExportRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { summaryData, originalFilename, summarySize } = req.body;
      
      logger.info(`PDF export request: ${originalFilename} for user: ${req.user._id}`);

      // Add watermark for free users
      const addWatermark = req.subscription.plan === 'free';
      const pdfBuffer = await exportToPDF(summaryData, originalFilename, summarySize, addWatermark);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.pdf"`);
      res.send(pdfBuffer);

      logger.info(`PDF export completed: ${originalFilename} for user: ${req.user._id}`);

    } catch (error) {
      logger.error(`PDF export error: ${error.message}`, { 
        userId: req.user._id,
        filename: req.body.originalFilename,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Error generating PDF', details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  }
);

app.post('/api/export/docx', 
  requireAuth, 
  checkSubscription, 
  validateExportRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { summaryData, originalFilename, summarySize } = req.body;
      
      logger.info(`DOCX export request: ${originalFilename} for user: ${req.user._id}`);

      // Add watermark for free users
      const addWatermark = req.subscription.plan === 'free';
      const docxBuffer = await exportToDOCX(summaryData, originalFilename, summarySize, addWatermark);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.docx"`);
      res.send(docxBuffer);

      logger.info(`DOCX export completed: ${originalFilename} for user: ${req.user._id}`);

    } catch (error) {
      logger.error(`DOCX export error: ${error.message}`, { 
        userId: req.user._id,
        filename: req.body.originalFilename,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Error generating DOCX', details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  }
);

app.post('/api/export/txt', 
  requireAuth, 
  checkSubscription, 
  validateExportRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { summaryData, originalFilename, summarySize } = req.body;
      
      logger.info(`TXT export request: ${originalFilename} for user: ${req.user._id}`);

      // Add watermark for free users
      const addWatermark = req.subscription.plan === 'free';
      const txtContent = await exportToTXT(summaryData, originalFilename, summarySize, addWatermark);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.txt"`);
      res.send(txtContent);

      logger.info(`TXT export completed: ${originalFilename} for user: ${req.user._id}`);

    } catch (error) {
      logger.error(`TXT export error: ${error.message}`, { 
        userId: req.user._id,
        filename: req.body.originalFilename,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Error generating TXT', details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  }
);

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  logger.error(`Unhandled error: ${error.message}`, { 
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    stack: error.stack 
  });
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Connect to MongoDB with enhanced error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/document-summarizer', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Node version: ${process.version}`);
  logger.info(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
}); 