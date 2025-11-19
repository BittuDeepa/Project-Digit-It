const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res, next) => {
  try {
    const { email, password, role, teacherId } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }
    if (role === 'student' && !teacherId) {
      return res.status(400).json({ success: false, message: 'TeacherId required for student.' });
    }
    // Check for duplicate email
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, teacherId: role==='student' ? teacherId : undefined });
    res.status(201).json({ success: true, user: { _id: user._id, email: user.email, role: user.role, teacherId: user.teacherId } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    // Sign JWT
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token, user: { _id: user._id, email: user.email, role: user.role, teacherId: user.teacherId } });
  } catch (err) {
    next(err);
  }
};
