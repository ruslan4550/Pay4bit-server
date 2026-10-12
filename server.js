const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// Middleware
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
    // Gələn məbləği mütləq rəqəmə (float) çeviririk, əks halda default 1 EUR olsun
    let amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount < 1) {
      amount = 1; 
    }
    
    // Pay4bit bəzən tam ədəd tələb edir və ya nöqtəli format istəyir (məsələn: 1.00)
    const sum = amount.toFixed(2);
    const currency = req.body.currency || 'EUR';
    const account = 'user_' + Date.now();

    // ---------------------------------------------------------
    // İMZA (SIGNATURE) YARADILMASI
    // ---------------------------------------------------------
    const signString = `${PUBLIC_KEY}:${sum}:${currency}:${account}:${SECRET_KEY}`;
    const signature = crypto.createHash('sha256').update(signString).digest('hex');

    // Pay4bit formunun tələb etdiyi parametrlər
    res.json({
      success: true,
      payment_url: PAY4BIT_FORM_URL,
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: sum, // Pay4bit bəzi hallarda 'amount' yox 'sum' gözləyir, imza da buna uyğundur
        currency: currency,
        signature: signature
      }
    });

  } catch (error) {
    console.error('Ödəniş yaradılarkən xəta:', error);
    res.status(500).json({ success: false, error: 'Server xətası baş verdi' });
  }
});

// ==================== 2. WEBHOOK ====================
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook gəldi:', JSON.stringify(req.body));
    const { account, sum, status, currency } = req.body;

    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Uğurlu ödəniş: ${account} — ${sum} ${currency}`);
    } else {
      console.log(`❌ Status: ${status}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook xətası:', error);
    res.status(500).send('Error');
  }
});

// ==================== 3. TEST ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ Backend aktivdir',
    message: 'Pay4bit server işləyir!'
  });
});

// ==================== SERVERİ BAŞLAT ====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda işləyir`);
});
