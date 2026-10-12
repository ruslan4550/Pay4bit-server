const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_KEY = '36cf4-712';
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73';
const PAY4BIT_URL = 'https://api.pay4bit.net/pay';

app.post('/create-payment', (req, res) => {
  try {
    // Məbləğ (minimum 1.00 EUR olmalıdır)
    let sum = parseFloat(req.body.sum || 5);
    if (isNaN(sum) || sum < 1) sum = 5;

    const amount = sum.toFixed(2);           // mütləq "5.00" formatı
    const currency = 'EUR';
    const account = String(req.body.account || ('user_' + Date.now()));
    const desc = String(req.body.desc || ('YevroLato #' + account));

    // RƏSMİ İMZA (docs-a 100% uyğun)
    // check_sign = sha256(desc + account + amount + secret_key)
    const signString = desc + account + amount + SECRET_KEY;
    const signature = crypto.createHash('sha256').update(signString, 'utf8').digest('hex');

    console.log('=== PAY4BIT GÖNDƏRİLƏN ===');
    console.log({ public_key: PUBLIC_KEY, account, sum: amount, currency, desc, sign: signature });

    res.json({
      success: true,
      url: PAY4BIT_URL,
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: amount,          // "5.00"
        currency: currency,
        desc: desc,
        sign: signature
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda`));