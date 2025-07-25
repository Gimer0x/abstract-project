const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../services/stripeService');
const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');
const { requireAuth } = require('../middleware/auth');

// Create checkout session for subscription
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { priceId } = req.body;
    
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing`;

    const session = await stripeService.createCheckoutSession(
      req.user._id,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get user's subscription status
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    const usage = await Usage.getCurrentUsage(req.user._id);
    const limits = Usage.getLimits(subscription?.plan || 'free');
    
    if (!subscription) {
      // Create free subscription for new users
      const freeSubscription = new Subscription({
        userId: req.user._id,
        stripeCustomerId: 'free',
        stripeSubscriptionId: 'free',
        plan: 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      await freeSubscription.save();
      
      return res.json({
        subscription: freeSubscription,
        usage: {
          documentsThisMonth: usage.documentCount,
          pagesThisMonth: usage.pageCount,
          limits: limits
        }
      });
    }

    res.json({
      subscription,
      usage: {
        documentsThisMonth: usage.documentCount,
        pagesThisMonth: usage.pageCount,
        limits: limits
      }
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await stripeService.cancelSubscription(req.user._id);
    res.json({ message: 'Subscription will be canceled at the end of the current period' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate-subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await stripeService.reactivateSubscription(req.user._id);
    res.json({ message: 'Subscription reactivated' });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Get usage statistics
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    const currentUsage = await Usage.getCurrentUsage(req.user._id);
    const limits = Usage.getLimits(subscription?.plan || 'free');
    const limitCheck = await Usage.hasExceededLimit(req.user._id, subscription?.plan || 'free');
    
    res.json({
      currentUsage,
      limits: limits,
      hasExceeded: limitCheck.exceeded,
      limitReason: limitCheck.reason,
      plan: subscription?.plan || 'free'
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Stripe webhook handler (simplified for now)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('Webhook received (simplified mode)');
  res.json({ received: true });
});

// Manual subscription update for testing (remove in production)
router.post('/update-subscription', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'premium', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    let subscription = await Subscription.findOne({ userId: req.user._id });
    
    if (!subscription) {
      subscription = new Subscription({
        userId: req.user._id,
        stripeCustomerId: 'test',
        stripeSubscriptionId: 'test',
        plan: plan,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    } else {
      subscription.plan = plan;
      subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    await subscription.save();
    
    res.json({ 
      message: `Subscription updated to ${plan}`,
      subscription 
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Get pricing information
router.get('/pricing', (req, res) => {
  const pricing = {
    plans: [
      {
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          '5 documents per month',
          'Short and Medium summaries',
          'Basic export formats (PDF, Word, TXT)',
          'Watermarked exports'
        ],
        priceId: null
      },
      {
        name: 'Premium',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        features: [
          '50 documents per month',
          'All summary sizes (short, medium, long)',
          'All export formats (PDF, DOCX, TXT)',
          'Full document history',
          'No watermarks'
        ],
        priceId: 'price_premium_monthly'
      },
      {
        name: 'Premium Annual',
        price: 99.99,
        currency: 'USD',
        interval: 'year',
        features: [
          '50 documents per month',
          'All summary sizes (short, medium, long)',
          'All export formats (PDF, DOCX, TXT)',
          'Full document history',
          'No watermarks',
          '2 months free'
        ],
        priceId: 'price_premium_annual'
      },
      {
        name: 'Pro',
        price: 19.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited documents',
          'All summary sizes',
          'All export formats',
          'Advanced analytics',
          'White-label exports',
          'No watermark'
        ],
        priceId: 'price_pro_monthly'
      },
      {
        name: 'Pro Annual',
        price: 199.99,
        currency: 'USD',
        interval: 'year',
        features: [
          'Unlimited documents',
          'All summary sizes',
          'All export formats',
          'Advanced analytics',
          'White-label exports',
          'No watermark',
          '2 months free'
        ],
        priceId: 'price_pro_annual'
      }
    ]
  };

  res.json(pricing);
});

module.exports = router; 