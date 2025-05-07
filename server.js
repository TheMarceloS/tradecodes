// server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 10000;

// In-memory word list and base responses
const words = [];
const responses = [
  "ERIS47"
];

// ✅ CORS setup for frontend
app.use(cors({
  origin: 'https://themarcelos.github.io',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors()); // Handle preflight
app.use(express.json());

// 📝 Submit a new word
app.post('/submit-word', async (req, res) => {
  const word = req.body.word?.trim().toLowerCase();
  const usedWords = req.body.usedWords || [];

  if (!word) return res.status(400).json({ error: 'Word is required' });
  if (!/^[a-zA-Z]+\d+$/.test(word)) return res.status(400).json({ error: 'This is not a valid input.' });
  if (words.includes(word)) return res.status(409).json({ error: 'This word was already submitted.' });

  // Filter out used words and current input word
  const filteredWords = words.filter(w => !usedWords.includes(w) && w !== word);
  const replyPool = responses.concat(filteredWords);
  const reply = replyPool[Math.floor(Math.random() * replyPool.length)];

  try {
    console.log("Trying to send email for:", word);
    await sendEmail(word);
    console.log("Email sent successfully!");
    res.json({ message: reply });
    words.push(word); // Add after selecting reply
  } catch (err) {
    console.error("Email failed:", err.message);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// 🔐 Admin-only: Get word list
app.post('/words', (req, res) => {
  const password = req.body.password;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ words });
});

// 🗑️ Admin-only: Remove a word
app.delete('/words', (req, res) => {
  const password = req.body.password;
  const wordToRemove = req.body.word?.trim().toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const index = words.indexOf(wordToRemove);
  if (index === -1) return res.status(404).json({ error: 'Word not found' });

  words.splice(index, 1);
  res.json({ message: 'Word removed successfully' });
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
  console.log(`Server running on port ${PORT}`);
});
