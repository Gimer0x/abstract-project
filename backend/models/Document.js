const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  summary: {
    rawResponse: {
      type: String,
      required: true
    },
    executiveSummary: {
      type: String,
      required: true
    },
    keyPoints: [{
      type: String
    }],
    actionItems: [{
      type: String
    }],
    importantDates: [{
      type: String
    }],
    relevantNames: [{
      type: String
    }],
    places: [{
      type: String
    }]
  },
  summarySize: {
    type: String,
    enum: ['short', 'medium', 'long'],
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
documentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema); 