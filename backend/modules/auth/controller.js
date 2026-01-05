import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../schemas/user.js';
const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken(user);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email exists' });
  const hash = bcrypt.hashSync(password, 10);
  const user = await User.create({ email, passwordHash: hash, name, role });
  res.status(201).json({ id: user._id, email: user.email, role: user.role });
});

router.post('/refresh', (req, res) => {
  // For demo: just re-issue a new token
  const { token } = req.body;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = signToken(payload);
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
