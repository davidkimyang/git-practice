const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const user = db.prepare('SELECT id, username, email, nickname, role, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: '토큰이 만료되었거나 유효하지 않습니다.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const user = db.prepare('SELECT id, username, email, nickname, role, is_active FROM users WHERE id = ?').get(decoded.userId);
    req.user = (user && user.is_active) ? user : null;
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, requireAdmin, optionalAuth };
