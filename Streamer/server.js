const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = aexpress();
const PORT = 3000;

// PayPal API credentials -
const PAYPAL_CLIENT_ID = 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = 'YOUR_PAYPAL_CLIENT_SECRET';
const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Use 'https://api-m.paypal.com' for production

const paymentLogPath = path.join(__dirname, 'payment_log.json');

// --- Helper Functions ---

/**
 * Reads the payment log, creating it if it doesn't exist.
 * @returns {Array} An array of payment objects.
 */
function readPaymentLog() {
  try {
    if (fs.existsSync(paymentLogPath)) {
      const data = fs.readFileSync(paymentLogPath, 'utf8');
      return JSON.parse(data);
    } else {
      fs.writeFileSync(paymentLogPath, '[]', 'utf8');
      return [];
    }
  } catch (error) {
    console.error('Error reading payment log:', error);
    return [];
  }
}

/**
 * Appends a new payment record to the log.
 * @param {object} paymentRecord - The payment record to add.
 */
function writePaymentLog(paymentRecord) {
  try {
    const payments = readPaymentLog();
    payments.push(paymentRecord);
    fs.writeFileSync(paymentLogPath, JSON.stringify(payments, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to payment log:', error);
  }
}

/**
 * Generates a PayPal access token.
 * @returns {Promise<string>} The access token.
 */
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to get PayPal access token: ${errorDetails}`);
  }

  const data = await response.json();
  return data.access_token;
}


// --- Middleware ---

app.use(bodyParser.json());
// Serve the marketing website statically
app.use(express.static('marketing'));


// --- API Endpoints ---

/**
 * Endpoint to create a PayPal payment order.
 * Expects a JSON body with an 'email' field.
 */
app.post('/api/create-payment', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '3.00',
        },
        description: 'Lifetime access to Little Streamer',
        custom_id: email, // Pass the user's email to PayPal
      }],
      application_context: {
        return_url: `http://localhost:${PORT}/success.html`,
        cancel_url: `http://localhost:${PORT}/cancel.html`,
        brand_name: 'Little Streamer',
        user_action: 'PAY_NOW',
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (response.ok) {
      res.json({ approvalUrl: order.links.find(link => link.rel === 'approve').href });
    } else {
      console.error('PayPal create order failed:', order);
      res.status(500).json({ error: 'Failed to create PayPal order.' });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


/**
 * Webhook endpoint for PayPal to send notifications.
 */
app.post('/api/paypal-webhook', async (req, res) => {
  const webhookEvent = req.body;

  // IMPORTANT: You must verify the webhook signature in a production environment!
  // This is a simplified example.
  // See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature

  if (webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
    const orderDetails = webhookEvent.resource;
    const email = orderDetails.purchase_units[0].custom_id;
    const transactionId = orderDetails.id;
    const paymentTime = orderDetails.update_time;
    const amount = orderDetails.purchase_units[0].amount.value;
    const currency = orderDetails.purchase_units[0].amount.currency_code;

    console.log(`✅ Payment successful for ${email}!`);

    const paymentRecord = {
      email,
      transactionId,
      paymentTime,
      amount,
      currency,
      status: 'Completed',
    };

    writePaymentLog(paymentRecord);
  }

  res.sendStatus(200); // Respond to PayPal to acknowledge receipt
});


// --- Server Start ---

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('IMPORTANT: Replace placeholder PayPal credentials in server.js');
});
