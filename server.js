// server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 10000;

// In-memory storage
const words = [];
const responses = [
  "Nice choice!",
  "That's an interesting word!",
  "Cool, added!",
  "Good pick!",
  "Word saved successfully!"
];

// ✅ Fix CORS for GitHub Pages frontend
app.use(cors({
  origin: 'https://themarcelos.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// POST endpoint to add word
app.post('/submit-word', async (req, res) => {
  const word = req.body.word?.trim().toLowerCase();
  const usedWords = req.body.usedWords || [];
  if (!word) return res.status(400).json({ error: 'Word is required' });
  if (words.includes(word)) return res.status(409).json({ error: 'Word already exists' });

  words.push(word);

  // Exclude user's own words from reply pool
  const filteredWords = words.filter(w => !usedWords.includes(w));
  const replyPool = responses.concat(filteredWords);
  const reply = replyPool[Math.floor(Math.random() * replyPool.length)];

  try {
    console.log("Trying to send email for:", word);
    await sendEmail(word);
    console.log("Email sent successfully!");
    res.json({ message: reply });
  } catch (err) {
    console.error("Email failed:", err.message);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// POST endpoint to securely view all words (with password)
app.post('/words', (req, res) => {
  const password = req.body.password;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ words });
});

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
