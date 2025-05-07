import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 10000;

const words = [];
const responses = [
  "Nice choice!",
  "That's an interesting word!",
  "Cool, added!",
  "Good pick!",
  "Word saved successfully!"
];

app.use(cors());
app.use(express.json());

app.post('/submit-word', async (req, res) => {
  const word = req.body.word?.trim().toLowerCase();
  if (!word) return res.status(400).json({ error: 'Word is required' });
  if (words.includes(word)) return res.status(409).json({ error: 'Word already exists' });

  words.push(word);
  const reply = responses[Math.floor(Math.random() * responses.length)];

  try {
    await sendEmail(word);
    res.json({ message: `${reply} (${word} added)` });
  } catch (err) {
    res.status(500).json({ error: 'Email sending failed' });
  }
});

async function sendEmail(word) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // e.g. youremail@gmail.com
      pass: process.env.EMAIL_PASS  // app password
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // you can change this
    subject: 'New Word Added',
    text: `A new word was added: ${word}`
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
