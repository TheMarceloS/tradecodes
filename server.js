// server.js (Supabase version with debug logs + .maybeSingle fix)
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Supabase client setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORS setup
const corsOptions = {
  origin: 'https://themarcelos.github.io',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// 📝 Submit a new word
app.post('/submit-word', async (req, res) => {
  const word = req.body.word?.trim().toLowerCase();
  const usedWords = req.body.usedWords || [];

  console.log("📥 /submit-word received:");
  console.log("  - word:", word);
  console.log("  - usedWords:", usedWords);

  if (!word) return res.status(400).json({ error: 'Word is required' });
  if (!/^[a-zA-Z]+\d+$/.test(word)) return res.status(400).json({ error: 'This is not a valid input.' });

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('words')
      .select('value')
      .eq('value', word)
      .maybeSingle();  // <-- Updated here

    if (fetchErr) console.error("⚠️ Fetch error:", fetchErr);
    if (existing) return res.status(409).json({ error: 'This word was already submitted.' });

    const { data: allWords, error: getErr } = await supabase
      .from('words')
      .select('value');

    if (getErr) {
      console.error("❌ Failed to fetch words:", getErr);
      return res.status(500).json({ error: 'Failed to fetch words.' });
    }

    const serverWords = allWords.map(w => w.value);
    const filteredWords = serverWords.filter(w => !usedWords.includes(w) && w !== word);
    const responses = ['ERIS47', ...filteredWords];
    const reply = responses[Math.floor(Math.random() * responses.length)];

    const { error: insertErr } = await supabase
      .from('words')
      .insert([{ value: word }]);

    if (insertErr) {
      console.error("❌ Failed to insert word:", insertErr);
      return res.status(500).json({ error: 'Failed to store word.' });
    }

    console.log("📧 Sending email...");
    await sendEmail(word);
    console.log("✅ Email sent");

    res.json({ message: reply });
  } catch (err) {
    console.error("🔥 Server error:", err);
    res.status(500).json({ error: 'Unexpected internal error.' });
  }
});

// 🔐 Admin-only: Get word list
app.post('/words', async (req, res) => {
  const password = req.body.password;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabase.from('words').select('value');
  if (error) return res.status(500).json({ error: 'Failed to retrieve words.' });

  res.json({ words: data.map(w => w.value) });
});

// 🗑️ Admin-only: Remove a word
app.delete('/words', async (req, res) => {
  const password = req.body.password;
  const wordToRemove = req.body.word?.trim().toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { error } = await supabase
    .from('words')
    .delete()
    .eq('value', wordToRemove);

  if (error) return res.status(500).json({ error: 'Failed to remove word.' });

  res.json({ message: 'Word removed successfully' });
});

// 🌐 Public sync endpoint for usedWords cleanup
app.get('/approved-words', async (req, res) => {
  const { data, error } = await supabase.from('words').select('value');
  if (error) return res.status(500).json({ error: 'Failed to load words.' });

  res.json({ words: data.map(w => w.value) });
});

// 📧 Email via nodemailer
async function sendEmail(word) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'New Word Added',
    text: `A new word was added: ${word}`
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
