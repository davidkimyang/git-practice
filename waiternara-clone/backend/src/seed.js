require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDB } = require('./config/database');

const db = getDB();

// Seed admin user
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare(`INSERT INTO users (username, email, password, nickname, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)`)
    .run('admin', 'admin@waiternara.kr', bcrypt.hashSync('admin1234', 10), '관리자', 'admin');
  console.log('Admin user created: admin / admin1234');
}

// Seed test user
const testExists = db.prepare("SELECT id FROM users WHERE username = 'testuser'").get();
if (!testExists) {
  db.prepare(`INSERT INTO users (username, email, password, nickname, is_verified) VALUES (?, ?, ?, ?, 1)`)
    .run('testuser', 'test@waiternara.kr', bcrypt.hashSync('test1234', 10), '테스트유저');
  console.log('Test user created: testuser / test1234');
}

const testUser = db.prepare("SELECT id FROM users WHERE username = 'testuser'").get();

// Seed jobs
const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '수원', '울산'];
const grades = ['premium', 'special', 'regular', 'regular', 'regular'];
const jobTitles = [
  '홀서빙 알바 구합니다', '야간 웨이터 모집', '레스토랑 서빙 스태프',
  '호텔 웨이터 채용', '바 서버 모집', '커피숍 서빙 알바',
  '이자카야 홀 직원', '고급 레스토랑 웨이터', '클럽 서버 모집', '카페 서빙 직원',
];
const companies = [
  '강남 클럽 베가스', '부산 씨푸드 레스토랑', '대구 이탈리안 비스트로',
  '인천 가든 파티', '광주 루프탑 바', '대전 스테이크하우스',
  '수원 이자카야 사쿠라', '울산 해산물 레스토랑', '홍대 클럽 OOH', '강남 바 라운지',
];

const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
if (jobCount.count < 10) {
  for (let i = 0; i < jobTitles.length; i++) {
    db.prepare(`
      INSERT INTO jobs (user_id, title, company_name, region, job_type, grade, salary_type, salary_min, salary_max, work_hours, description, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testUser.id, jobTitles[i], companies[i], regions[i % regions.length],
      i % 3 === 0 ? 'specialist' : 'general',
      grades[i % grades.length], 'monthly',
      2500000 + (i * 100000), 3500000 + (i * 100000),
      '오후 6시 ~ 새벽 2시',
      `${companies[i]}에서 함께 일할 웨이터를 모집합니다. 성실하고 밝은 분 우대. 주 5일 근무. 식사 제공.`,
      `010-${1000 + i * 100}-${5000 + i * 10}`
    );
  }
  console.log('Sample jobs created');
}

// Seed community posts
const boards = ['talk', 'tip', 'story', 'news'];
const postData = [
  { board: 'talk', title: '웨이터 처음 시작하는데 팁 좀 알려주세요', content: '이번에 처음으로 웨이터 일을 시작하게 됐는데 어떤 것들을 미리 준비하면 좋을까요?' },
  { board: 'tip', title: '손님 응대 잘하는 방법 공유합니다', content: '5년차 웨이터로서 터득한 노하우를 공유합니다. 1. 항상 미소 유지 2. 빠른 응대...' },
  { board: 'story', title: '오늘 진짜 웃긴 일 있었음 ㅋㅋ', content: '오늘 손님이 메뉴 주문하다가 갑자기 노래를 부르기 시작했는데...' },
  { board: 'news', title: '최저임금 인상 소식! 웨이터에게 미치는 영향은?', content: '내년도 최저임금이 인상됨에 따라 서빙 알바 시급도 변동이 예상됩니다.' },
  { board: 'talk', title: '강남 vs 홍대 어디가 더 낫나요?', content: '강남이랑 홍대 둘 다 경험해본 분들 어디가 더 근무환경 좋았나요?' },
  { board: 'tip', title: '무거운 트레이 들고 다니는 요령', content: '트레이를 들고 다닐 때 중심을 잡는 방법과 손목 보호하는 방법을 알려드릴게요.' },
];

const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
if (postCount.count < 6) {
  postData.forEach(p => {
    db.prepare('INSERT INTO posts (user_id, board_type, title, content) VALUES (?, ?, ?, ?)').run(testUser.id, p.board, p.title, p.content);
  });
  console.log('Sample posts created');
}

console.log('Seeding complete!');
