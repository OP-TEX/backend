const Stripe = require('stripe');
const stripe = new Stripe(process.env.stripeSecretKey);

const createPaymentIntent = async (amount, orderId, customerEmail) => {
  try {
    // Amount should be in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: { orderId },
      receipt_email: customerEmail,
      description: `Payment for Order #${orderId}`
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

const verifyPaymentStatus = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: paymentIntent.status,
      succeeded: paymentIntent.status === 'succeeded',
      amount: paymentIntent.amount / 100 // Convert from cents
    };
  } catch (error) {
    console.error('Error verifying payment status:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  verifyPaymentStatus
};