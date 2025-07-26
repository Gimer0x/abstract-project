require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products and prices...');

    // Create products
    const premiumProduct = await stripe.products.create({
      name: 'Premium Plan',
      description: '50 documents per month, all summary sizes, full document history, no watermarks',
      metadata: {
        plan: 'premium'
      }
    });

    const proProduct = await stripe.products.create({
      name: 'Pro Plan',
      description: 'Unlimited documents, all features, advanced analytics',
      metadata: {
        plan: 'pro'
      }
    });

    console.log('Products created:', {
      premium: premiumProduct.id,
      pro: proProduct.id
    });

    // Create prices for Premium plan
    const premiumMonthlyPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 999, // $9.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'premium',
        interval: 'monthly'
      }
    });

    const premiumYearlyPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 9999, // $99.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        plan: 'premium',
        interval: 'yearly'
      }
    });

    // Create prices for Pro plan
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1999, // $19.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'pro',
        interval: 'monthly'
      }
    });

    const proYearlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 19999, // $199.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        plan: 'pro',
        interval: 'yearly'
      }
    });

    console.log('Prices created:');
    console.log('Premium Monthly:', premiumMonthlyPrice.id);
    console.log('Premium Yearly:', premiumYearlyPrice.id);
    console.log('Pro Monthly:', proMonthlyPrice.id);
    console.log('Pro Yearly:', proYearlyPrice.id);

    console.log('\nUpdate your Pricing.js component with these price IDs:');
    console.log('Premium Monthly:', premiumMonthlyPrice.id);
    console.log('Premium Yearly:', premiumYearlyPrice.id);
    console.log('Pro Monthly:', proMonthlyPrice.id);
    console.log('Pro Yearly:', proYearlyPrice.id);

  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

// Run the setup
setupStripeProducts(); 