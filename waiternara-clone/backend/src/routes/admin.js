const express = require('express');
const { getDB } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const db = getDB();
  const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get();
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE is_active = 1').get();
  const posts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE is_active = 1').get();
  const comments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE is_active = 1').get();
  const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").get();
  const todayJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE date(created_at) = date('now')").get();
  const todayPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE date(created_at) = date('now')").get();

  res.json({
    totalUsers: users.count,
    totalJobs: jobs.count,
    totalPosts: posts.count,
    totalComments: comments.count,
    todayUsers: todayUsers.count,
    todayJobs: todayJobs.count,
    todayPosts: todayPosts.count,
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = req.query.search;
  const db = getDB();

  let conditions = [];
  let params = [];
  if (search) {
    conditions.push('(username LIKE ? OR email LIKE ? OR nickname LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params);
  const users = db.prepare(`SELECT id, username, email, nickname, phone, role, is_active, is_verified, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ users, total: total.count, page, totalPages: Math.ceil(total.count / limit) });
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
  const { role, is_active } = req.body;
  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

  const updates = [];
  const values = [];
  if (role !== undefined) { updates.push('role = ?'); values.push(role); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });

  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  res.json({ message: '사용자 정보가 수정되었습니다.' });
});

// GET /api/admin/jobs
router.get('/jobs', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  const jobs = db.prepare(`
    SELECT j.*, u.nickname as author_nickname FROM jobs j
    LEFT JOIN users u ON j.user_id = u.id
    ORDER BY j.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ jobs, total: total.count, page, totalPages: Math.ceil(total.count / limit) });
});

// PUT /api/admin/jobs/:id
router.put('/jobs/:id', (req, res) => {
  const { is_active, grade } = req.body;
  const db = getDB();
  const updates = [];
  const values = [];
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (grade !== undefined) { updates.push('grade = ?'); values.push(grade); }
  if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });
  values.push(req.params.id);
  db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: '채용공고가 수정되었습니다.' });
});

// GET /api/admin/posts
router.get('/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  const posts = db.prepare(`
    SELECT p.id, p.board_type, p.title, p.views, p.likes, p.is_active, p.created_at,
           u.nickname as author_nickname
    FROM posts p LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ posts, total: total.count, page, totalPages: Math.ceil(total.count / limit) });
});

// DELETE /api/admin/posts/:id (hard delete)
router.delete('/posts/:id', (req, res) => {
  const db = getDB();
  db.prepare('UPDATE posts SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: '게시글이 삭제되었습니다.' });
});

module.exports = router;
