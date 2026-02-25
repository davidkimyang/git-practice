const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 4, max: 20 }).withMessage('아이디는 4~20자여야 합니다.'),
  body('email').isEmail().withMessage('유효한 이메일을 입력해주세요.'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 6자 이상이어야 합니다.'),
  body('nickname').trim().isLength({ min: 2, max: 20 }).withMessage('닉네임은 2~20자여야 합니다.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, nickname, phone } = req.body;
  const db = getDB();

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ? OR nickname = ?').get(username, email, nickname);
  if (existing) {
    return res.status(409).json({ message: '이미 사용 중인 아이디, 이메일, 또는 닉네임입니다.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password, nickname, phone, is_verified) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(username, email, hashedPassword, nickname, phone || null);

  const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const user = db.prepare('SELECT id, username, email, nickname, role FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('아이디를 입력해주세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const { password: _, ...userWithoutPassword } = user;

  res.json({ token, user: userWithoutPassword });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, [
  body('phone').optional().isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력해주세요.'),
], (req, res) => {
  const { phone } = req.body;
  const db = getDB();
  db.prepare('UPDATE users SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(phone || null, req.user.id);
  const updated = db.prepare('SELECT id, username, email, nickname, phone, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updated });
});

// PUT /api/auth/password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword').isLength({ min: 6 }).withMessage('새 비밀번호는 6자 이상이어야 합니다.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  const db = getDB();
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);
  res.json({ message: '비밀번호가 변경되었습니다.' });
});

module.exports = router;
