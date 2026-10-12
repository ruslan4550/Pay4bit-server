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

// ==================== 1. ÖDƏNİŞ YARATMA (Signature ilə) ====================
// Frontend-dəki "Mastercard/Visa" düyməsinə basanda bura müraciət olunacaq
app.post('/create-payment', (req, res) => {
  try {
    // Frontend-dən gələn məbləğ və valyuta (göndərilməzsə standart olaraq 1 EUR)
    const sum = req.body.amount || 1; 
    const currency = req.body.currency || 'EUR';

    // İstifadəçi üçün unikal ödəniş (hesab) ID-si yaradırıq
    const account = 'user_' + Date.now();

    // ---------------------------------------------------------
    // İMZA (SIGNATURE) YARADILMASI
    // Təhlükəsizlik üçün məlumatları gizli açarla birləşdirib şifrələyirik.
    // QEYD: Əgər Pay4Bit xüsusi bir ardıcıllıq tələb edirsə (məsələn: account:sum:currency:secret)
    // o zaman signString ardıcıllığını ona uyğun dəyişmək lazımdır.
    // ---------------------------------------------------------
    const signString = `${PUBLIC_KEY}:${sum}:${currency}:${account}:${SECRET_KEY}`;
    
    // MD5 və ya SHA256 istifadə oluna bilər (əksər sistemlər sha256 istifadə edir)
    const signature = crypto.createHash('sha256').update(signString).digest('hex');

    // Məlumatları (imza daxil olmaqla) frontend-ə qaytarırıq
    res.json({
      success: true,
      payment_url: PAY4BIT_FORM_URL,
      params: {
        public_key: PUBLIC_KEY,
        account: account,
        sum: sum,
        currency: currency,
        signature: signature // Pay4Bit-in tələb etdiyi əsas parametr!
      }
    });

  } catch (error) {
    console.error('Ödəniş yaradılarkən xəta:', error);
    res.status(500).json({ success: false, error: 'Server xətası baş verdi' });
  }
});

// ==================== 2. WEBHOOK (Pay4Bit-dən gələn təsdiq) ====================
app.post('/webhook', (req, res) => {
  try {
    console.log('📥 Webhook gəldi:', JSON.stringify(req.body));
    const { account, sum, status, currency } = req.body;

    if (status === 'AC' || status === 'CO') {
      console.log(`✅ Uğurlu ödəniş: ${account} — ${sum} ${currency}`);
      // DİQQƏT: Bura istifadəçinin saytdakı balansını (məsələn, verilənlər bazasında) artırmaq kodunu yazacaqsınız.
    } else if (status === 'FA' || status === 'DE' || status === 'EX') {
      console.log(`❌ Uğursuz: ${account} — Status: ${status}`);
    } else {
      console.log(`⏳ Gözləmədə: ${account} — Status: ${status}`);
    }

    // Pay4Bit-ə məlumatı aldığımızı təsdiqləyirik
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
    message: 'Digital Signature (Rəqəmsal İmza) dəstəklənir!'
  });
});

// ==================== SERVERİ BAŞLAT ====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda işləyir`);
  console.log(`🔒 Digital Signature (Rəqəmsal İmza) modulu aktivdir`);
});
