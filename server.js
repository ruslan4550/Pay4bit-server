const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== KONFİQURASİYA ====================
// ⚠️ BU AÇARLARI PAY4BIT PANELİNDƏN GÖTÜR
const PUBLIC_KEY = '74eca712'; // Panelindəki Public key
const SECRET_KEY = 'd868aee241455e6216d3a99cb3283d73'; // Panelindəki Secret key
const PAY4BIT_FORM_URL = 'https://api.pay4bit.net/pay'; // HTML form action URL-i

// ==================== 1. ÖDƏNİŞ YARATMA ====================
// Frontend bu endpoint-ə sorğu göndərir: POST /create-payment
// Body: { account, sum, desc }
app.post('/create-payment', (req, res) => {
  try {
    const { account, sum, desc } = req.body;

    // Validasiya
    if (!account || !sum) {
      return res.status(400).json({ error: 'account və sum tələb olunur' });
    }

    const amount = parseFloat(sum).toFixed(2); // "50.00" formatı
    const description = desc || 'Depozit ödənişi';

    // Sign hesablaması: SHA256(desc + account + amount + SECRET_KEY)
    // Sənədlərə görə: "SHA256 hash of the concatenated parameters: desc, account, amount (with 2 decimal places), and SECRET KEY"
    const signString = description + account + amount + SECRET_KEY;
    const sign = crypto.createHash('sha256').update(signString).digest('hex');

    // Frontend-ə qaytarılacaq məlumatlar
    res.json({
      public_key: PUBLIC_KEY,
      account: account,
      sum: amount,
      desc: description,
      sign: sign,
      payment_url: PAY4BIT_FORM_URL
    });

  } catch (error) {
    console.error('❌ create-payment xətası:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});

// ==================== 2. WEBHOOK (ÖDƏNİŞ TƏSDİQİ) ====================
// Pay4Bit ödəniş tamamlandıqda bu endpoint-ə POST sorğusu göndərir
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook gəldi:', JSON.stringify(req.body));

    const { sign, account, sum, desc, status, nonce } = req.body;

    // ---- İmza yoxlaması ----
    // Əgər "Enable digital signature verification" aktivdirsə, yoxlama aparılır.
    // Pay4Bit webhook imzası HMAC-SHA256 ilə hesablanır: HMAC(secret, nonce + body)
    // Lakin HTML formu üçün sign yoxlaması fərqli ola bilər.
    // Aşağıda hər iki ehtimalı yoxlayırıq:

    let signatureValid = true;

    // Variant A: Form sign yoxlaması (create-payment-dəki kimi)
    if (sign && account && sum) {
      const expectedSign = crypto.createHash('sha256')
        .update((desc || '') + account + parseFloat(sum).toFixed(2) + SECRET_KEY)
        .digest('hex');

      if (sign !== expectedSign) {
        console.warn('⚠️ Sign uyğun deyil! Gözlənilən:', expectedSign, 'Gələn:', sign);
        signatureValid = false;
      }
    }

    // Variant B: HMAC-SHA256 yoxlaması (API Gateway webhook-ları üçün)
    // Pay4Bit sənədlərində webhook test vektoru var:
    // secret_hex: 02d4b921007cad413e79731dd02b3267cd43a14d150a0ae6a1c651942122bb62
    // nonce: 1645634942
    // body: {...}
    // signature: HMAC-SHA256(secret, nonce + body)
    // Əgər panelində "Enable digital signature verification" aktivdirsə,
    // aşağıdaki yoxlama işə düşür:
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

    // ---- Ödəniş statusunu yoxla ----
    // Statuslar: NR, PE, AC, IA, CO, CA, EX, OC, FA, DE, CM
    // Uğurlu statuslar: AC (təsdiqlənib), CO (tamamlanıb)
    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Ödəniş uğurlu: ${account} — ${sum} AZN — Status: ${status}`);

      // ✅ BURADA İSTİFADƏÇİNİN BALANSINI ARTIR
      // Məsələn, verilənlər bazasında:
      // await db.users.updateOne({ email: account }, { $inc: { balance: parseFloat(sum) } });
      // Və ya birbaşa öz saytına webhook göndər:
      // await fetch('https://saytin.com/api/balance-update', { ... });

    } else if (status === 'FA' || status === 'DE' || status === 'EX') {
      console.log(`❌ Ödəniş uğursuz: ${account} — Status: ${status}`);
    } else {
      console.log(`⏳ Ödəniş gözləmədə: ${account} — Status: ${status}`);
    }

    // Pay4Bit-ə "OK" cavabı qaytar (vacibdir!)
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
});