const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const User = require('../models/User');

class StripeService {
  // Create a Stripe customer
  async createCustomer(user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Create a checkout session for subscription
  async createCheckoutSession(userId, priceId, successUrl, cancelUrl) {
    try {
      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get or create Stripe customer
      let subscription = await Subscription.findOne({ userId });
      let customerId;

      if (subscription && subscription.stripeCustomerId) {
        customerId = subscription.stripeCustomerId;
      } else {
        const customer = await this.createCustomer(user);
        customerId = customer.id;
        
        // Create free subscription record
        if (!subscription) {
          subscription = new Subscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: 'free',
            plan: 'free',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          });
          await subscription.save();
        }
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId.toString()
        },
        subscription_data: {
          metadata: {
            userId: userId.toString()
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Handle webhook events (simplified for now)
  async handleWebhook(event) {
    console.log(`Webhook event received: ${event.type} (simplified mode)`);
    // For now, just log the event
    return true;
  }

  // Handle subscription creation/update
  async handleSubscriptionChange(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        console.error('User not found for subscription:', subscription.id);
        return;
      }

      // Determine plan from price ID
      const plan = this.getPlanFromPriceId(subscription.items.data[0].price.id);
      
      // Update or create subscription record
      await Subscription.findOneAndUpdate(
        { userId },
        {
          stripeSubscriptionId: subscription.id,
          plan: plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        },
        { upsert: true, new: true }
      );

      console.log(`Subscription updated for user ${userId}: ${plan}`);
    } catch (error) {
      console.error('Error handling subscription change:', error);
      throw error;
    }
  }

  // Handle subscription cancellation
  async handleSubscriptionCanceled(subscription) {
    try {
      const userId = subscription.metadata.userId;
      
      await Subscription.findOneAndUpdate(
        { userId },
        {
          plan: 'free',
          status: 'canceled',
          cancelAtPeriodEnd: true
        }
      );

      console.log(`Subscription canceled for user ${userId}`);
    } catch (error) {
      console.error('Error handling subscription cancellation:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handlePaymentSucceeded(invoice) {
    try {
      console.log(`Payment succeeded for invoice: ${invoice.id}`);
      // You can add additional logic here (e.g., send confirmation email)
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  // Handle failed payment
  async handlePaymentFailed(invoice) {
    try {
      console.log(`Payment failed for invoice: ${invoice.id}`);
      // You can add additional logic here (e.g., send retry email)
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  // Get plan from Stripe price ID
  getPlanFromPriceId(priceId) {
    // You'll need to update these with your actual Stripe price IDs
    const priceMap = {
      'price_premium_monthly': 'premium',
      'price_premium_annual': 'premium',
      'price_pro_monthly': 'pro',
      'price_pro_annual': 'pro'
    };
    
    return priceMap[priceId] || 'free';
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({ userId });
      
      if (!subscription || subscription.stripeSubscriptionId === 'free') {
        throw new Error('No active subscription found');
      }

      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await Subscription.findOneAndUpdate(
        { userId },
        { cancelAtPeriodEnd: true }
      );

      return stripeSubscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Reactivate subscription
  async reactivateSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({ userId });
      
      if (!subscription || subscription.stripeSubscriptionId === 'free') {
        throw new Error('No subscription found');
      }

      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: false }
      );

      await Subscription.findOneAndUpdate(
        { userId },
        { cancelAtPeriodEnd: false }
      );

      return stripeSubscription;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }
}

module.exports = new StripeService(); 