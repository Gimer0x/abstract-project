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

// Increment document count for current month
usageSchema.statics.incrementUsage = async function(userId) {
  const currentMonth = this.getCurrentMonth();
  
  try {
    const usage = await this.findOneAndUpdate(
      { userId, month: currentMonth },
      { 
        $inc: { documentCount: 1 },
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
      return this.incrementUsage(userId);
    }
    throw error;
  }
};

// Get current month usage
usageSchema.statics.getCurrentUsage = async function(userId) {
  const currentMonth = this.getCurrentMonth();
  const usage = await this.findOne({ userId, month: currentMonth });
  return usage ? usage.documentCount : 0;
};

// Check if user has exceeded their limit
usageSchema.statics.hasExceededLimit = async function(userId, plan) {
  const limits = {
    free: 5,
    premium: 50,
    pro: Infinity
  };
  
  const limit = limits[plan] || limits.free;
  
  if (limit === Infinity) {
    return false; // Pro users have unlimited
  }
  
  const currentUsage = await this.getCurrentUsage(userId);
  return currentUsage >= limit;
};

module.exports = mongoose.model('Usage', usageSchema); 