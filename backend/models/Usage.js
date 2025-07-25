const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true,
    // Format: "YYYY-MM" (e.g., "2024-01")
  },
  documentCount: {
    type: Number,
    default: 0
  },
  pageCount: {
    type: Number,
    default: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  }
});

// Compound index for userId + month to ensure unique monthly records
usageSchema.index({ userId: 1, month: 1 }, { unique: true });

// Get current month in YYYY-MM format
usageSchema.statics.getCurrentMonth = function() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Increment usage for current month
usageSchema.statics.incrementUsage = async function(userId, pageCount = 0) {
  const currentMonth = this.getCurrentMonth();
  
  try {
    const usage = await this.findOneAndUpdate(
      { userId, month: currentMonth },
      { 
        $inc: { 
          documentCount: 1,
          pageCount: pageCount
        },
        $setOnInsert: { lastReset: new Date() }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return usage;
  } catch (error) {
    // Handle duplicate key error (shouldn't happen with upsert)
    if (error.code === 11000) {
      return this.incrementUsage(userId, pageCount);
    }
    throw error;
  }
};

// Get current month usage
usageSchema.statics.getCurrentUsage = async function(userId) {
  const currentMonth = this.getCurrentMonth();
  const usage = await this.findOne({ userId, month: currentMonth });
  return {
    documentCount: usage ? usage.documentCount : 0,
    pageCount: usage ? usage.pageCount : 0
  };
};

// Check if user has exceeded their limits
usageSchema.statics.hasExceededLimit = async function(userId, plan) {
  const limits = {
    free: { documents: 5, pages: 100 },
    premium: { documents: 50, pages: 1000 },
    pro: { documents: Infinity, pages: Infinity }
  };
  
  const limit = limits[plan] || limits.free;
  
  if (limit.documents === Infinity && limit.pages === Infinity) {
    return { exceeded: false, reason: null }; // Pro users have unlimited
  }
  
  const currentUsage = await this.getCurrentUsage(userId);
  
  // Check document limit
  if (currentUsage.documentCount >= limit.documents) {
    return { 
      exceeded: true, 
      reason: 'document_limit',
      current: currentUsage.documentCount,
      limit: limit.documents
    };
  }
  
  // Check page limit
  if (currentUsage.pageCount >= limit.pages) {
    return { 
      exceeded: true, 
      reason: 'page_limit',
      current: currentUsage.pageCount,
      limit: limit.pages
    };
  }
  
  return { exceeded: false, reason: null };
};

// Get usage limits for a plan
usageSchema.statics.getLimits = function(plan) {
  const limits = {
    free: { documents: 5, pages: 100 },
    premium: { documents: 50, pages: 1000 },
    pro: { documents: Infinity, pages: Infinity }
  };
  
  return limits[plan] || limits.free;
};

module.exports = mongoose.model('Usage', usageSchema); 