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
  if (!word) return res.status(400).json({ error: 'Word is required' });
  if (words.includes(word)) return res.status(409).json({ error: 'Word already exists' });

  words.push(word);
  const reply = responses[Math.floor(Math.random() * responses.length)];

  try {
    console.log("Trying to send email for:", word);
    await sendEmail(word);
    console.log("Email sent successfully!");
    res.json({ message: `${reply} (${word} added)` });
  } catch (err) {
    console.error("Email failed:", err.message);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// GET endpoint to view all words
app.get('/words', (req, res) => {
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
