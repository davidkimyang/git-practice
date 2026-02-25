export const MOCK_JOBS = [
  { id: 1, title: '강남 클럽 홀서빙 모집', company_name: '클럽 베가스', region: '서울', grade: 'premium', salary_min: 3000000, salary_max: 5000000, work_hours: '오후 9시 ~ 새벽 4시', views: 312, created_at: new Date().toISOString() },
  { id: 2, title: '부산 해운대 레스토랑 웨이터', company_name: '씨뷰 레스토랑', region: '부산', grade: 'special', salary_min: 2800000, salary_max: 4000000, work_hours: '오후 6시 ~ 새벽 2시', views: 187, created_at: new Date().toISOString() },
  { id: 3, title: '홍대 바 서버 급구', company_name: '라운지 바 M', region: '서울', grade: 'regular', salary_min: 2500000, salary_max: 3500000, work_hours: '오후 8시 ~ 새벽 3시', views: 95, created_at: new Date().toISOString() },
  { id: 4, title: '이자카야 홀 직원 모집', company_name: '사쿠라 이자카야', region: '대구', grade: 'regular', salary_min: 2600000, salary_max: 3200000, work_hours: '오후 5시 ~ 자정', views: 74, created_at: new Date().toISOString() },
  { id: 5, title: '인천 호텔 웨이터 채용', company_name: '그랜드 호텔 인천', region: '인천', grade: 'premium', salary_min: 3500000, salary_max: 6000000, work_hours: '협의', views: 241, created_at: new Date().toISOString() },
  { id: 6, title: '광주 나이트클럽 서버', company_name: '클럽 루비', region: '광주', grade: 'special', salary_min: 2900000, salary_max: 4500000, work_hours: '오후 9시 ~ 새벽 5시', views: 156, created_at: new Date().toISOString() },
];

export const MOCK_POSTS = [
  { id: 1, board_type: 'talk', title: '웨이터 처음 시작하는데 팁 좀 알려주세요!', author_nickname: '신입웨이터', views: 532, comment_count: 12, likes: 24, created_at: new Date().toISOString() },
  { id: 2, board_type: 'tip', title: '트레이 들고 다니는 요령 - 5년차 경험 공유', author_nickname: '베테랑김씨', views: 1243, comment_count: 28, likes: 87, created_at: new Date().toISOString() },
  { id: 3, board_type: 'story', title: '오늘 진짜 웃긴 일 있었음 ㅋㅋㅋ', author_nickname: '홍대아르바이터', views: 874, comment_count: 45, likes: 112, created_at: new Date().toISOString() },
  { id: 4, board_type: 'news', title: '최저임금 인상 확정! 웨이터 시급 변동 정리', author_nickname: '업계소식통', views: 2341, comment_count: 67, likes: 203, created_at: new Date().toISOString() },
  { id: 5, board_type: 'talk', title: '강남 vs 홍대, 어디가 더 일하기 좋나요?', author_nickname: '경험자박씨', views: 678, comment_count: 33, likes: 55, created_at: new Date().toISOString() },
];
