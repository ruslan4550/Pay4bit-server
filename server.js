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
    // Sınamaq üçün birbaşa məcburi 5 EUR təyin edirik
    const sum = "5.00"; 
    const currency = "EUR";
    const account = 'user_' + Date.now();

    // Pay4bit rəsmi sənədlərinə uyğun imza sətri
    const signString = `${PUBLIC_KEY}:${sum}:${currency}:${account}:${SECRET_KEY}`;
    const signature = crypto.createHash('sha256').update(signString).digest('hex');

    console.log("Göndərilən məlumatlar:", { PUBLIC_KEY, account, sum, currency, signature });

    res.json({
      success: true,
      payment_url: PAY4BIT_FORM_URL,
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: sum,
        currency: currency,
        signature: signature
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
