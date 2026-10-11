const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== KONFİQURASİYA ====================
const PUBLIC_KEY = '36cf4-712';
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73';
const PAY4BIT_FORM_URL = 'https://api.pay4bit.net/pay';

// ==================== 1. ÖDƏNİŞ YARATMA ====================
app.post('/create-payment', (req, res) => {
  try {
    const { account, sum, desc } = req.body;

    if (!account || !sum) {
      return res.status(400).json({ error: 'account və sum tələb olunur' });
    }

    const amount = parseFloat(sum).toFixed(2);
    const description = desc || 'Depozit ödənişi';

    if (parseFloat(amount) < 1) {
      return res.status(400).json({ error: 'Minimum məbləğ 1 EUR olmalıdır' });
    }

    // Sign: SHA256(desc + account + amount + SECRET_KEY)
    const checkSignString = description + account + amount + SECRET_KEY;
    const sign = crypto.createHash('sha256').update(checkSignString).digest('hex');

    console.log('📤 Create payment:', { account, sum: amount, currency: 'EUR' });

    res.json({
      public_key: PUBLIC_KEY,
      account: account,
      sum: amount,
      desc: description,
      sign: sign,
      payment_url: PAY4BIT_FORM_URL
    });

  } catch (error) {
    console.error('❌ Xəta:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ==================== 2. WEBHOOK ====================
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook:', JSON.stringify(req.body));
    const { account, sum, status } = req.body;

    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Uğurlu ödəniş: ${account} — ${sum} EUR`);
    } else if (status === 'FA' || status === 'DE' || status === 'EX') {
      console.log(`❌ Uğursuz ödəniş: ${account} — Status: ${status}`);
    } else {
      console.log(`⏳ Gözləmədə: ${account} — Status: ${status}`);
    }

    res.send('OK');
  } catch (error) {
    console.error('❌ Webhook xətası:', error);
    res.status(500).send('Error');
  }
});

// ==================== 3. TEST ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ Pay4Bit backend işləyir',
    public_key: PUBLIC_KEY,
    endpoints: {
      create_payment: 'POST /create-payment',
      webhook: 'POST /webhook'
    }
  });
});

// ==================== SERVERİ BAŞLAT ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda işləyir`);
  console.log(`📌 Public Key: ${PUBLIC_KEY}`);
});