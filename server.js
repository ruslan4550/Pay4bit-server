// ==================== 1. ÖDƏNİŞ YARATMA ====================
app.post('/create-payment', (req, res) => {
  try {
    const { account, sum, desc } = req.body;

    if (!account || !sum) {
      return res.status(400).json({ error: 'account və sum tələb olunur' });
    }

    const amount = parseFloat(sum).toFixed(2);
    const description = desc || 'Depozit ödənişi';

    // ⚠️ EUR minimum 1-dir, yoxlama
    if (parseFloat(amount) < 1) {
      return res.status(400).json({ error: 'Minimum məbləğ 1 EUR olmalıdır' });
    }

    // Sign: SHA256(desc + account + amount + SECRET_KEY)
    const signString = description + account + amount + SECRET_KEY;
    const sign = crypto.createHash('sha256').update(signString).digest('hex');

    res.json({
      public_key: PUBLIC_KEY,
      account: account,
      sum: amount,
      desc: description,
      sign: sign,
      currency: 'EUR',                              // ← YENİ
      payment_url: 'https://api.pay4bit.net/pay'
    });

  } catch (error) {
    console.error('❌ create-payment xətası:', error);
    res.status(500).json({ error: 'Server xətası' });
  }
});