const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== KONFİQURASİYA ====================
const PUBLIC_KEY = '36cf4-712';                                        // ← YENİ PUBLIC KEY
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73';                // ← Secret key (dəyişməyibsə)
const PAY4BIT_FORM_URL = 'https://api.pay4bit.net/pay';
const CURRENCY = 'AZN';                                                // ← AZN valyutası

// ==================== 1. ÖDƏNİŞ YARATMA ====================
app.post('/create-payment', (req, res) => {
  try {
    const { account, sum, desc } = req.body;

    if (!account || !sum) {
      return res.status(400).json({ error: 'account və sum tələb olunur' });
    }

    const amount = parseFloat(sum).toFixed(2); // "50.00"
    const description = desc || 'Depozit ödənişi';

    // AZN üçün minimum 3 ₼
    if (parseFloat(amount) < 3) {
      return res.status(400).json({ error: 'Minimum məbləğ 3 AZN olmalıdır' });
    }

    // check_sign = SHA256(desc + account + amount + SECRET_KEY)
    const checkSignString = description + account + amount + SECRET_KEY;
    const sign = crypto.createHash('sha256').update(checkSignString).digest('hex');

    console.log('📤 Create payment:', {
      account,
      sum: amount,
      currency: CURRENCY,
      sign: sign.slice(0, 16) + '...'
    });

    res.json({
      public_key: PUBLIC_KEY,
      account: account,
      sum: amount,
      desc: description,
      sign: sign,
      currency: CURRENCY,
      payment_url: PAY4BIT_FORM_URL
    });

  } catch (error) {
    console.error('❌ create-payment xətası:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ==================== 2. WEBHOOK ====================
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook gəldi:', JSON.stringify(req.body));

    const { sign, account, sum, desc, status, nonce, currency } = req.body;

    let signatureValid = true;

    // Form sign yoxlaması
    if (sign && account && sum) {
      const expectedSign = crypto.createHash('sha256')
        .update((desc || '') + account + parseFloat(sum).toFixed(2) + SECRET_KEY)
        .digest('hex');

      if (sign !== expectedSign) {
        console.warn('⚠️ Sign uyğun deyil!');
        signatureValid = false;
      }
    }

    // HMAC yoxlaması (əgər varsa)
    if (nonce && req.headers['x-b4bit-signature']) {
      const receivedSig = req.headers['x-b4bit-signature'];
      const hmac = crypto.createHmac('sha256', SECRET_KEY);
      hmac.update(nonce + JSON.stringify(req.body));
      const expectedHmac = hmac.digest('hex');

      if (receivedSig !== expectedHmac) {
        console.warn('⚠️ HMAC uyğun deyil!');
        signatureValid = false;
      }
    }

    if (!signatureValid) {
      return res.status(400).send('Invalid signature');
    }

    // Status yoxlaması
    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Ödəniş uğurlu: ${account} — ${sum} ${currency || 'AZN'} — Status: ${status}`);
      // BURADA İSTİFADƏÇİNİN BALANSINI ARTIR
    } else if (status === 'FA' || status === 'DE' || status === 'EX') {
      console.log(`❌ Ödəniş uğursuz: ${account} — Status: ${status}`);
    } else {
      console.log(`⏳ Ödəniş gözləmədə: ${account} — Status: ${status}`);
    }

    res.send('OK');

  } catch (error) {
    console.error('❌ Webhook xətası:', error);
    res.status(500).send('Server error');
  }
});

// ==================== 3. TEST ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ Pay4Bit backend işləyir',
    public_key: PUBLIC_KEY,
    currency: CURRENCY,
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
  console.log(`📌 Currency: ${CURRENCY}`);
});