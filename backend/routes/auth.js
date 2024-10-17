const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user || user.password !== req.body.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.json({ message: 'Logged in successfully', userId: user._id, username: user.username });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;