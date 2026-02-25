const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const BOARD_TYPES = ['talk', 'tip', 'story', 'news'];

// GET /api/posts?board_type=talk
router.get('/', optionalAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;
  const { board_type, search } = req.query;

  const db = getDB();
  let conditions = ['p.is_active = 1'];
  let params = [];

  if (board_type && BOARD_TYPES.includes(board_type)) {
    conditions.push('p.board_type = ?');
    params.push(board_type);
  }
  if (search) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) as count FROM posts p ${whereClause}`).get(...params);
  const posts = db.prepare(`
    SELECT p.id, p.board_type, p.title, p.views, p.likes, p.created_at,
           u.nickname as author_nickname,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_active = 1) as comment_count
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ posts, total: total.count, page, totalPages: Math.ceil(total.count / limit) });
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDB();
  const post = db.prepare(`
    SELECT p.*, u.nickname as author_nickname
    FROM posts p LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ? AND p.is_active = 1
  `).get(req.params.id);

  if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(req.params.id);
  post.views += 1;

  const comments = db.prepare(`
    SELECT c.*, u.nickname as author_nickname
    FROM comments c LEFT JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? AND c.is_active = 1
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  let liked = false;
  if (req.user) {
    const l = db.prepare("SELECT id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?").get(req.user.id, post.id);
    liked = !!l;
  }

  res.json({ post, comments, liked });
});

// POST /api/posts
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('제목을 입력해주세요.'),
  body('content').trim().notEmpty().withMessage('내용을 입력해주세요.'),
  body('board_type').isIn(BOARD_TYPES).withMessage('올바른 게시판을 선택해주세요.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, content, board_type } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO posts (user_id, board_type, title, content) VALUES (?, ?, ?, ?)').run(req.user.id, board_type, title, content);
  const post = db.prepare('SELECT p.*, u.nickname as author_nickname FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ post });
});

// PUT /api/posts/:id
router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }

  const { title, content } = req.body;
  db.prepare('UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title || post.title, content || post.content, req.params.id);
  const updated = db.prepare('SELECT p.*, u.nickname as author_nickname FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(req.params.id);
  res.json({ post: updated });
});

// DELETE /api/posts/:id
router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  db.prepare('UPDATE posts SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: '게시글이 삭제되었습니다.' });
});

// POST /api/posts/:id/like
router.post('/:id/like', authenticate, (req, res) => {
  const db = getDB();
  const existing = db.prepare("SELECT id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?").get(req.user.id, req.params.id);
  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?").run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes = likes - 1 WHERE id = ?').run(req.params.id);
    return res.json({ liked: false });
  }
  db.prepare("INSERT INTO likes (user_id, target_type, target_id) VALUES (?, 'post', ?)").run(req.user.id, req.params.id);
  db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  res.json({ liked: true });
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authenticate, [
  body('content').trim().notEmpty().withMessage('댓글 내용을 입력해주세요.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { content } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
  const comment = db.prepare('SELECT c.*, u.nickname as author_nickname FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ comment });
});

// DELETE /api/posts/comments/:commentId
router.delete('/comments/:commentId', authenticate, (req, res) => {
  const db = getDB();
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND is_active = 1').get(req.params.commentId);
  if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  db.prepare('UPDATE comments SET is_active = 0 WHERE id = ?').run(req.params.commentId);
  res.json({ message: '댓글이 삭제되었습니다.' });
});

module.exports = router;
