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

// ==================== 1. ÖDƏNİŞ URL-İ QAYTAR ====================
// Müştəri birbaşa Pay4Bit səhifəsinə yönləndirilir,
// məbləğ və kart məlumatları ORADA daxil edilir.
app.get('/payment-link', (req, res) => {
  res.json({
    public_key: PUBLIC_KEY,
    payment_url: PAY4BIT_FORM_URL
  });
});

// ==================== 2. WEBHOOK ====================
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook:', JSON.stringify(req.body));
    const { account, sum, status, currency } = req.body;

    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Uğurlu ödəniş: ${account} — ${sum} ${currency || 'EUR'}`);
    } else if (status === 'FA' || status === 'DE' || status === 'EX') {
      console.log(`❌ Uğursuz: ${account} — Status: ${status}`);
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
    payment_url: PAY4BIT_FORM_URL
  });
});

// ==================== SERVERİ BAŞLAT ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda işləyir`);
  console.log(`📌 Public Key: ${PUBLIC_KEY}`);
});