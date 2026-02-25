const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/jobs
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;
  const { region, grade, job_type, search } = req.query;

  const db = getDB();
  let conditions = ['j.is_active = 1'];
  let params = [];

  if (region) { conditions.push('j.region = ?'); params.push(region); }
  if (grade) { conditions.push('j.grade = ?'); params.push(grade); }
  if (job_type) { conditions.push('j.job_type = ?'); params.push(job_type); }
  if (search) {
    conditions.push('(j.title LIKE ? OR j.company_name LIKE ? OR j.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM jobs j ${whereClause}`).get(...params);
  const jobs = db.prepare(`
    SELECT j.*, u.nickname as author_nickname,
    CASE WHEN j.grade = 'premium' THEN 1 WHEN j.grade = 'special' THEN 2 ELSE 3 END as grade_order
    FROM jobs j
    LEFT JOIN users u ON j.user_id = u.id
    ${whereClause}
    ORDER BY grade_order ASC, j.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    jobs,
    total: total.count,
    page,
    totalPages: Math.ceil(total.count / limit),
  });
});

// GET /api/jobs/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDB();
  const job = db.prepare(`
    SELECT j.*, u.nickname as author_nickname, u.phone as author_phone
    FROM jobs j
    LEFT JOIN users u ON j.user_id = u.id
    WHERE j.id = ? AND j.is_active = 1
  `).get(req.params.id);

  if (!job) return res.status(404).json({ message: '채용공고를 찾을 수 없습니다.' });

  db.prepare('UPDATE jobs SET views = views + 1 WHERE id = ?').run(req.params.id);
  job.views += 1;

  let bookmarked = false;
  if (req.user) {
    const bm = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND job_id = ?').get(req.user.id, job.id);
    bookmarked = !!bm;
  }

  res.json({ job, bookmarked });
});

// POST /api/jobs
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('제목을 입력해주세요.'),
  body('company_name').trim().notEmpty().withMessage('업소명을 입력해주세요.'),
  body('region').notEmpty().withMessage('지역을 선택해주세요.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    title, company_name, region, district, job_type, grade,
    salary_type, salary_min, salary_max, work_hours, work_days,
    description, requirements, benefits, contact_phone, contact_kakao
  } = req.body;

  const db = getDB();
  const result = db.prepare(`
    INSERT INTO jobs (user_id, title, company_name, region, district, job_type, grade,
      salary_type, salary_min, salary_max, work_hours, work_days, description,
      requirements, benefits, contact_phone, contact_kakao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, title, company_name, region, district || null,
    job_type || 'general', grade || 'regular',
    salary_type || 'monthly', salary_min || null, salary_max || null,
    work_hours || null, work_days || null, description || null,
    requirements || null, benefits || null, contact_phone || null, contact_kakao || null
  );

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ job });
});

// PUT /api/jobs/:id
router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ message: '공고를 찾을 수 없습니다.' });
  if (job.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }

  const fields = ['title','company_name','region','district','job_type','grade','salary_type','salary_min','salary_max','work_hours','work_days','description','requirements','benefits','contact_phone','contact_kakao'];
  const updates = [];
  const values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });

  values.push(req.params.id);
  db.prepare(`UPDATE jobs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  res.json({ job: updated });
});

// DELETE /api/jobs/:id
router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ message: '공고를 찾을 수 없습니다.' });
  if (job.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  db.prepare('UPDATE jobs SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: '공고가 삭제되었습니다.' });
});

// POST /api/jobs/:id/bookmark
router.post('/:id/bookmark', authenticate, (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND job_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND job_id = ?').run(req.user.id, req.params.id);
    return res.json({ bookmarked: false });
  }
  db.prepare('INSERT INTO bookmarks (user_id, job_id) VALUES (?, ?)').run(req.user.id, req.params.id);
  res.json({ bookmarked: true });
});

// GET /api/jobs/my/bookmarks
router.get('/my/bookmarks', authenticate, (req, res) => {
  const db = getDB();
  const jobs = db.prepare(`
    SELECT j.* FROM jobs j
    INNER JOIN bookmarks b ON b.job_id = j.id
    WHERE b.user_id = ? AND j.is_active = 1
    ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json({ jobs });
});

module.exports = router;
