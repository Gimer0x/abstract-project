const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

// Function to convert image to base64
function imageToBase64(filePath) {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64String = imageBuffer.toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
}

const { processDocument } = require('./services/documentProcessor');
const { generateSummary } = require('./services/openaiService');
const { exportToPDF, exportToDOCX, exportToTXT, exportToMP3 } = require('./services/exportService');
const { checkTTSServiceAvailability } = require('./services/openaiTTSService');
const { validateImageFile, testImageProcessability, processImage, organizeTextFromPhotos: joinTextFromPhotos } = require('./services/photoProcessor');
const { exportToPDF: exportPhotoToPDF, exportToDOCX: exportPhotoToDOCX, exportToTXT: exportPhotoToTXT, exportToRTF: exportPhotoToRTF } = require('./services/photoExportService');

const { requireAuth, optionalAuth } = require('./middleware/auth');
const { canUploadDocument, incrementUsage, checkSubscription, canAccessFeature } = require('./middleware/subscriptionAuth');
const Document = require('./models/Document');
const Subscription = require('./models/Subscription');
const Photo = require('./models/Photo');

// Import passport configuration
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/document-summarizer')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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

// Configure multer for photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 50 // Maximum 50 images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPG, PNG, WebP, and HEIC files are allowed.'), false);
    }
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Document Summarizer API is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// TTS service health check endpoint
app.get('/health/tts', async (req, res) => {
  try {
    const isAvailable = await checkTTSServiceAvailability();
    res.json({ 
      status: isAvailable ? 'OK' : 'UNAVAILABLE',
      service: 'OpenAI TTS',
      timestamp: new Date().toISOString(),
      available: isAvailable
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      service: 'OpenAI TTS',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth routes
app.use('/auth', authRoutes);

// Billing routes
app.use('/billing', billingRoutes);

// Document processing endpoint for authenticated users with subscription checks
app.post('/api/process-document', requireAuth, canUploadDocument, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.originalname);

    // Extract text and page count from the uploaded document
    const documentData = await processDocument(req.file.path, req.file.originalname);
    
    if (!documentData.text || documentData.text.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the document' });
    }

    // Get summary size from request body (default to 'short')
    let summarySize = req.body.summarySize || 'short';
    
    // Check subscription plan for summary size restrictions
    if (req.subscription.plan === 'free' && summarySize === 'long') {
      summarySize = 'medium'; // Downgrade to medium for free users
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
    const { incrementUsage } = require('./middleware/subscriptionAuth');
    req.documentPageCount = documentData.pageCount;
    await incrementUsage(req, res, () => {});

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      originalFilename: req.file.originalname,
      summary: summary,
      summarySize: summarySize,
      plan: req.subscription.plan,
      usage: req.usage
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

// Document processing endpoint for guest users (short summaries only)
app.post('/api/process-document-guest', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file (guest):', req.file.originalname);

    // Extract text and page count from the uploaded document
    const documentData = await processDocument(req.file.path, req.file.originalname);
    
    if (!documentData.text || documentData.text.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the document' });
    }

    // Check page limit for guest users (max 2 pages)
    if (documentData.pageCount > 2) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
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
    console.error('Error processing document (guest):', error);
    
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

// Get user's document history (all authenticated users can access)
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
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
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Export endpoints (require authentication)
app.post('/api/export/pdf', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { summaryData, originalFilename, summarySize } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    console.log('PDF Export Request:', { originalFilename, summarySize, hasSummaryData: !!summaryData });

    // Add watermark for free users
    const addWatermark = req.subscription.plan === 'free';
    const pdfBuffer = await exportToPDF(summaryData, originalFilename, summarySize, addWatermark);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Error generating PDF', details: error.message });
  }
});

app.post('/api/export/docx', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { summaryData, originalFilename, summarySize } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    console.log('DOCX Export Request:', { originalFilename, summarySize, hasSummaryData: !!summaryData });

    // Add watermark for free users
    const addWatermark = req.subscription.plan === 'free';
    const docxBuffer = await exportToDOCX(summaryData, originalFilename, summarySize, addWatermark);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.docx"`);
    res.send(docxBuffer);

  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ error: 'Error generating DOCX', details: error.message });
  }
});

app.post('/api/export/txt', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { summaryData, originalFilename, summarySize } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    console.log('TXT Export Request:', { originalFilename, summarySize, hasSummaryData: !!summaryData });

    // Add watermark for free users
    const addWatermark = req.subscription.plan === 'free';
    const txtContent = await exportToTXT(summaryData, originalFilename, summarySize, addWatermark);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.txt"`);
    res.send(txtContent);

  } catch (error) {
    console.error('TXT export error:', error);
    res.status(500).json({ error: 'Error generating TXT', details: error.message });
  }
});

app.post('/api/export/mp3', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { summaryData, originalFilename, summarySize } = req.body;
    
    if (!summaryData || !originalFilename) {
      return res.status(400).json({ error: 'Missing summary data or filename' });
    }

    console.log('MP3 Export Request:', { originalFilename, summarySize, hasSummaryData: !!summaryData });

    // Generate MP3 audio file
    const mp3Buffer = await exportToMP3(summaryData, originalFilename, summarySize);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${originalFilename.replace(/\.[^/.]+$/, '')}.mp3"`);
    res.send(mp3Buffer);

  } catch (error) {
    console.error('MP3 export error:', error);
    res.status(500).json({ error: 'Error generating MP3', details: error.message });
  }
});

// Photo processing endpoints (Pro users only)
app.post('/api/process-photos', requireAuth, checkSubscription, photoUpload.array('photos', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Check if user has pro subscription
    if (req.subscription.plan !== 'pro') {
      return res.status(403).json({ error: 'Photo OCR is only available for Pro users' });
    }

    console.log('Processing photos:', req.files.length, 'files');

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const photos = [];

    // Create photo records in database
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const photo = new Photo({
        userId: req.user._id,
        batchId: batchId,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        processingOrder: i + 1,
        filePath: file.path // Store the file path for processing
      });

      await photo.save();
      photos.push(photo);
    }

    // Process photos in background
    processPhotosInBackground(photos, batchId);

    res.json({
      success: true,
      batchId: batchId,
      totalPhotos: photos.length,
      message: 'Photos uploaded successfully. Processing started.'
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Error uploading photos', details: error.message });
  }
});

// Get photo processing status
app.get('/api/photos/status/:batchId', requireAuth, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const completed = photos.filter(p => p.processingStatus === 'completed').length;
    const failed = photos.filter(p => p.processingStatus === 'failed').length;
    const processing = photos.filter(p => p.processingStatus === 'processing').length;
    const pending = photos.filter(p => p.processingStatus === 'pending').length;

    res.json({
      batchId: batchId,
      total: photos.length,
      completed: completed,
      failed: failed,
      processing: processing,
      pending: pending,
      photos: photos
    });

  } catch (error) {
    console.error('Photo status error:', error);
    res.status(500).json({ error: 'Error getting photo status', details: error.message });
  }
});

// Get photo processing results
app.get('/api/photos/results/:batchId', requireAuth, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Check if all photos are completed
    const allCompleted = photos.every(p => p.processingStatus === 'completed');
    
    if (!allCompleted) {
      return res.status(400).json({ error: 'Processing not completed yet' });
    }

    // Join text from photos
    const organizedText = await joinTextFromPhotos(photos);

    res.json({
      batchId: batchId,
      totalPhotos: photos.length,
      organizedText: organizedText,
      photos: photos
    });

  } catch (error) {
    console.error('Photo results error:', error);
    res.status(500).json({ error: 'Error getting photo results', details: error.message });
  }
});

// Photo export endpoints
app.post('/api/photos/export/pdf', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ error: 'Missing batch ID' });
    }

    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const organizedText = await joinTextFromPhotos(photos);
    const pdfBuffer = await exportPhotoToPDF(photos, organizedText, batchId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="photo-ocr-${batchId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Photo PDF export error:', error);
    res.status(500).json({ error: 'Error generating PDF', details: error.message });
  }
});

app.post('/api/photos/export/docx', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ error: 'Missing batch ID' });
    }

    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const organizedText = await joinTextFromPhotos(photos);
    const docxBuffer = await exportPhotoToDOCX(photos, organizedText, batchId);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="photo-ocr-${batchId}.docx"`);
    res.send(docxBuffer);

  } catch (error) {
    console.error('Photo DOCX export error:', error);
    res.status(500).json({ error: 'Error generating DOCX', details: error.message });
  }
});

app.post('/api/photos/export/txt', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ error: 'Missing batch ID' });
    }

    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const organizedText = await joinTextFromPhotos(photos);
    const txtContent = await exportPhotoToTXT(photos, organizedText, batchId);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="photo-ocr-${batchId}.txt"`);
    res.send(txtContent);

  } catch (error) {
    console.error('Photo TXT export error:', error);
    res.status(500).json({ error: 'Error generating TXT', details: error.message });
  }
});

app.post('/api/photos/export/rtf', requireAuth, checkSubscription, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({ error: 'Missing batch ID' });
    }

    const photos = await Photo.find({ 
      userId: req.user._id, 
      batchId: batchId 
    }).sort({ processingOrder: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const organizedText = await joinTextFromPhotos(photos);
    const rtfContent = await exportPhotoToRTF(photos, organizedText, batchId);
    
    res.setHeader('Content-Type', 'application/rtf');
    res.setHeader('Content-Disposition', `attachment; filename="photo-ocr-${batchId}.rtf"`);
    res.send(rtfContent);

  } catch (error) {
    console.error('Photo RTF export error:', error);
    res.status(500).json({ error: 'Error generating RTF', details: error.message });
  }
});

// Background photo processing function
async function processPhotosInBackground(photos, batchId) {
  try {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Update status to processing
        await Photo.findByIdAndUpdate(photo._id, { 
          processingStatus: 'processing' 
        });

        // Test if image can be processed
        const processabilityTest = await testImageProcessability(photo.filePath);
        if (!processabilityTest.processable) {
          // Update with error if image cannot be processed
          await Photo.findByIdAndUpdate(photo._id, {
            errorMessage: processabilityTest.error,
            processingStatus: 'failed',
            processedAt: new Date()
          });
          continue; // Skip to next image
        }

        // Convert image to base64 for thumbnails
        const base64Data = imageToBase64(photo.filePath);
        
        // Process the image
        const result = await processImage(photo.filePath, photo.originalFilename);
        
        if (result.success) {
          // Update with results
          await Photo.findByIdAndUpdate(photo._id, {
            extractedText: result.extractedText,
            imageDescription: result.imageDescription,
            base64Data: base64Data,
            processingStatus: 'completed',
            processedAt: new Date()
          });
        } else {
          // Update with error
          await Photo.findByIdAndUpdate(photo._id, {
            errorMessage: result.error,
            base64Data: base64Data,
            processingStatus: 'failed',
            processedAt: new Date()
          });
        }
        
      } catch (error) {
        console.error(`Error processing photo ${photo.originalFilename}:`, error);
        
        // Update with error
        await Photo.findByIdAndUpdate(photo._id, {
          errorMessage: error.message,
          processingStatus: 'failed',
          processedAt: new Date()
        });
      }
    }
    
    console.log(`Photo processing completed for batch: ${batchId}`);
    
  } catch (error) {
    console.error('Background photo processing error:', error);
  }
}

// Photo history endpoint
app.get('/api/photos/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const photos = await Photo.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 photos
    
    res.json({ photos });
    
  } catch (error) {
    console.error('Photo history error:', error);
    res.status(500).json({ error: 'Failed to fetch photo history' });
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