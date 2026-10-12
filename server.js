const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_KEY = '36cf4-712';
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73';
const PAY4BIT_FORM_URL = 'https://api.pay4bit.net/pay';

app.post('/create-payment', (req, res) => {
  try {
    // İstədiyiniz məbləği buradan və ya req.body-dən götürün
    let sum = parseFloat(req.body.sum || 5);   // minimum 1 EUR
    if (isNaN(sum) || sum < 1) sum = 5;

    const amount = sum.toFixed(2);              // mütləq "5.00" formatı
    const currency = (req.body.currency || 'EUR').toUpperCase();
    const account = req.body.account || ('user_' + Date.now());
    const desc = req.body.desc || ('Payment #' + account);

    // RƏSMİ İMZA (docs-a uyğun)
    const signString = desc + account + amount + SECRET_KEY;
    const signature = crypto.createHash('sha256').update(signString).digest('hex');

    console.log('Pay4Bit params:', { public_key: PUBLIC_KEY, account, sum: amount, currency, desc, sign: signature });

    res.json({
      success: true,
      payment_url: PAY4BIT_FORM_URL,
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: amount,          // "5.00"
        currency: currency,
        desc: desc,
        sign: signature       // check_sign
      }
    });

  } catch (error) {
    console.error('Xəta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Server işləyir' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portundadır`);
});