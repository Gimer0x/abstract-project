const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  batchId: {
    type: String,
    required: true,
    index: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  imageDescription: {
    type: String,
    default: ''
  },
  processedText: {
    type: String,
    default: ''
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  processingOrder: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  base64Data: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
});

// Index for efficient queries
photoSchema.index({ userId: 1, batchId: 1 });
photoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Photo', photoSchema);
