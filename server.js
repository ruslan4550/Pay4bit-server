const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static HTML (rovsen.html) eyni serverdən gəlsin
app.use(express.static(__dirname));

const PUBLIC_KEY = '36cf4-712';
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73';
const PAY4BIT_URL = 'https://api.pay4bit.net/pay';

app.post('/create-payment', (req, res) => {
  try {
    let sum = parseFloat(req.body.sum || 5);
    if (isNaN(sum) || sum < 1) sum = 5;

    const amount = sum.toFixed(2);               // "5.00"
    const currency = 'EUR';
    const account = String(req.body.account || ('user_' + Date.now()));
    const desc = String(req.body.desc || ('YevroLato #' + account));

    // RƏSMİ İMZA (docs.pay4bit.net)
    const signString = desc + account + amount + SECRET_KEY;
    const signature = crypto.createHash('sha256').update(signString, 'utf8').digest('hex');

    console.log('=== PAY4BIT ===', { public_key: PUBLIC_KEY, account, sum: amount, currency, desc, sign: signature });

    res.json({
      success: true,
      url: PAY4BIT_URL,                 // frontend data.url axtarır
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: amount,
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'rovsen.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});