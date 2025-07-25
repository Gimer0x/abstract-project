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
    const limitCheck = await Usage.hasExceededLimit(req.user._id, subscription.plan);
    const limits = Usage.getLimits(subscription.plan);

    // Add subscription and usage info to request
    req.subscription = subscription;
    req.usage = {
      current: currentUsage,
      hasExceeded: limitCheck.exceeded,
      limitReason: limitCheck.reason,
      limits: limits
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
      const { reason, current, limit } = req.usage.limitReason;
      const { current: usage } = req.usage;
      
      let errorMessage = 'You have reached your monthly limit. Please upgrade your plan to continue.';
      let details = '';
      
      if (reason === 'document_limit') {
        errorMessage = 'Document limit exceeded';
        details = `You have processed ${usage.documentCount} documents this month (limit: ${req.usage.limits.documents}). Please upgrade your plan to continue.`;
      } else if (reason === 'page_limit') {
        errorMessage = 'Page limit exceeded';
        details = `You have processed ${usage.pageCount} pages this month (limit: ${req.usage.limits.pages}). Please upgrade your plan to continue.`;
      }
      
      return res.status(403).json({
        error: errorMessage,
        message: details,
        currentUsage: usage,
        limits: req.usage.limits,
        plan: req.subscription.plan,
        reason: reason
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
      // Get page count from the processed document
      const pageCount = req.documentPageCount || 0;
      await Usage.incrementUsage(req.user._id, pageCount);
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