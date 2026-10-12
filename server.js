const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TƏHLÜKƏSİZLİK: yalnız "public" qovluğu açıq olur.
// Əvvəl express.static(__dirname) idi və server.js (SECRET_KEY daxil) brauzerdən yüklənə bilirdi.
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// Açarları Render -> Environment bölməsində təyin et (PAY4BIT_PUBLIC_KEY, PAY4BIT_SECRET_KEY).
const PUBLIC_KEY = process.env.PAY4BIT_PUBLIC_KEY || '36cf4-712';
const SECRET_KEY = process.env.PAY4BIT_SECRET_KEY || 'd868aee241455e6216d3a99cb3283d73';
const PAY4BIT_URL = 'https://api.pay4bit.net/pay';

if (!process.env.PAY4BIT_SECRET_KEY) {
  console.warn('[XƏBƏRDARLIQ] PAY4BIT_SECRET_KEY environment dəyişəni yoxdur, koddakı açar istifadə olunur.');
}

const CURRENCIES = ['AZN', 'AED', 'USD', 'EUR', 'GBP', 'UAH', 'BGN', 'BRL', 'CAD', 'CDF', 'CZK', 'CHF', 'DKK',
  'GEL', 'HUF', 'INR', 'MDL', 'NGN', 'NOK', 'RON', 'ETB', 'THB', 'TRY', 'PLN', 'KZT', 'KGS', 'TJS', 'UZS', 'MAD'];
const PAY_SYSTEMS = ['amex', 'discover', 'unionpay', 'jcb', 'visa', 'mastercard', 'litecoin', 'xrp', 'dot',
  'solana', 'bitcoin', 'usdt', 'trx', 'bank_us', 'bank_eu', 'bank_uk', 'bank_tr'];
const MIN_SUM = 1; // Pay4bit minimumu: 1 EUR

// "5", "5.5", "5,50", " 5.00 " -> Number. Yanlışdırsa NaN qaytarır.
function parseSum(raw) {
  if (raw === undefined || raw === null) return NaN;
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Number(s);
}

function createPayment(req, res) {
  try {
    // GET (query) və POST (body) hər ikisi dəstəklənir; sum/amount/price adları qəbul olunur
    const src = { ...req.query, ...req.body };
    const rawSum = src.sum ?? src.amount ?? src.price;

    if (rawSum === undefined || rawSum === '') {
      return res.status(400).json({
        success: false,
        error: 'Məbləğ göndərilməyib. Frontend "sum" sahəsini göndərməlidir.',
        received: src
      });
    }

    const sumNum = parseSum(rawSum);
    if (Number.isNaN(sumNum)) {
      return res.status(400).json({
        success: false,
        error: `Məbləğ yanlış formatdadır: "${rawSum}". Nümunə: 5 və ya 5.50`,
        received: src
      });
    }

    const currency = String(src.currency || 'EUR').toUpperCase();
    if (!CURRENCIES.includes(currency)) {
      return res.status(400).json({ success: false, error: `Dəstəklənməyən valyuta: ${currency}` });
    }

    // Minimum 1 EUR qaydası (EUR üçün yoxlanılır; başqa valyutada Pay4bit özü çevirir)
    if (currency === 'EUR' && sumNum < MIN_SUM) {
      return res.status(400).json({
        success: false,
        error: `Minimum ödəniş məbləği ${MIN_SUM} EUR-dur. Göndərilən: ${sumNum}`
      });
    }

    const amount = sumNum.toFixed(2); // "5.00" (nöqtə, 2 rəqəm, min ayırıcı yox)

    // Pay4bit sənədi: imza bir ödəniş üçün istifadə olunduqdan sonra təkrar işlədilə bilməz.
    // Ona görə hər sorğuda unikal order id yaradırıq.
    const orderId = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const baseAccount = String(src.account || 'user').slice(0, 60);
    const account = `${baseAccount}_${orderId}`;
    const baseDesc = String(src.desc || 'YevroLato').slice(0, 100);
    const desc = `${baseDesc} #${orderId}`;

    // RƏSMİ İMZA: sha256(desc + account + amount + SECRET_KEY), ayırıcı yoxdur
    const signString = desc + account + amount + SECRET_KEY;
    const sign = crypto.createHash('sha256').update(signString, 'utf8').digest('hex');

    const params = {
      public_key: PUBLIC_KEY,
      account,
      sum: amount,
      currency,
      desc,
      sign
    };

    const payTo = String(src.paySystem || '').toLowerCase();
    if (payTo) {
      if (!PAY_SYSTEMS.includes(payTo)) {
        return res.status(400).json({ success: false, error: `Dəstəklənməyən paySystem: ${payTo}` });
      }
      params.paySystem = payTo;
    }

    // Pay4bit sənədinə görə form default GET ilə göndərilir -> hazır GET linki də veririk
    const redirect_url = `${PAY4BIT_URL}?${new URLSearchParams(params).toString()}`;

    console.log('=== PAY4BIT ===', { account, sum: amount, currency, desc, from: req.headers.origin || req.ip });

    res.json({
      success: true,
      url: PAY4BIT_URL,
      method: 'GET',
      params,
      redirect_url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}

app.post('/create-payment', createPayment);
app.get('/create-payment', createPayment); // brauzerdən sürətli test üçün

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'rovsen.html'), (err) => {
    if (err) res.sendFile(path.join(PUBLIC_DIR, 'fortnite-test.html'));
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});
