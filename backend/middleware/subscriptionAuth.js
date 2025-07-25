const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');

// Middleware to check subscription status and usage limits
const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's subscription
    let subscription = await Subscription.findOne({ userId: req.user._id });
    
    if (!subscription) {
      // Create free subscription for new users
      subscription = new Subscription({
        userId: req.user._id,
        stripeCustomerId: 'free',
        stripeSubscriptionId: 'free',
        plan: 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      await subscription.save();
    }

    // Get current usage
    const currentUsage = await Usage.getCurrentUsage(req.user._id);
    const hasExceeded = await Usage.hasExceededLimit(req.user._id, subscription.plan);

    // Add subscription and usage info to request
    req.subscription = subscription;
    req.usage = {
      current: currentUsage,
      hasExceeded: hasExceeded,
      limit: subscription.plan === 'pro' ? Infinity : (subscription.plan === 'premium' ? 50 : 5)
    };

    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
};

// Middleware to check if user can upload documents
const canUploadDocument = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get subscription info (reuse from checkSubscription if available)
    if (!req.subscription) {
      await checkSubscription(req, res, () => {});
      // If checkSubscription sent a response, don't continue
      if (res.headersSent) return;
    }

    // Check if user has exceeded their limit
    if (req.usage && req.usage.hasExceeded) {
      return res.status(403).json({
        error: 'Document limit exceeded',
        message: 'You have reached your monthly document limit. Please upgrade your plan to continue.',
        currentUsage: req.usage.current,
        limit: req.usage.limit,
        plan: req.subscription.plan
      });
    }

    next();
  } catch (error) {
    console.error('Error checking upload permission:', error);
    res.status(500).json({ error: 'Failed to check upload permission' });
  }
};

// Middleware to check if user can access premium features
const canAccessFeature = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get subscription info (reuse from checkSubscription if available)
      if (!req.subscription) {
        await checkSubscription(req, res, () => {});
      }

      const featureAccess = {
        'long_summary': ['premium', 'pro'],
        'document_history': ['premium', 'pro'],
        'no_watermark': ['premium', 'pro'],
        'advanced_analytics': ['pro'],
        'white_label': ['pro']
      };

      const allowedPlans = featureAccess[feature] || [];
      
      if (!allowedPlans.includes(req.subscription.plan)) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature is not available in your current plan (${req.subscription.plan}). Please upgrade to access ${feature}.`,
          requiredPlan: allowedPlans[0] || 'premium'
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
};

// Middleware to increment usage after successful document processing
const incrementUsage = async (req, res, next) => {
  try {
    if (req.user && req.subscription) {
      await Usage.incrementUsage(req.user._id);
    }
    next();
  } catch (error) {
    console.error('Error incrementing usage:', error);
    // Don't fail the request if usage tracking fails
    next();
  }
};

module.exports = {
  checkSubscription,
  canUploadDocument,
  canAccessFeature,
  incrementUsage
}; 