import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobsAPI, postsAPI } from '../utils/api';
import JobCard from '../components/common/JobCard';
import { MOCK_JOBS, MOCK_POSTS } from '../utils/mockData';

const REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '수원', '울산', '제주'];

export default function Home() {
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    jobsAPI.getAll({ limit: 6 })
      .then(res => setFeaturedJobs(res.data.jobs))
      .catch(() => setFeaturedJobs(MOCK_JOBS));
    postsAPI.getAll({ limit: 5 })
      .then(res => setRecentPosts(res.data.posts))
      .catch(() => setRecentPosts(MOCK_POSTS));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/jobs?search=${encodeURIComponent(search)}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            웨이터 전문 구인구직
          </h1>
          <p className="text-red-100 text-lg mb-8">믿고 볼 수 있는 검증된 채용공고</p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="업소명, 지역, 직종으로 검색..."
              className="flex-1 px-5 py-3 rounded-full text-gray-800 text-base outline-none shadow-lg"
            />
            <button type="submit" className="bg-white text-red-600 font-bold px-6 py-3 rounded-full hover:bg-red-50 transition-colors shadow-lg">
              검색
            </button>
          </form>
        </div>
      </section>

      {/* Region Shortcuts */}
      <section className="bg-white shadow-sm py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {REGIONS.map(region => (
              <Link
                key={region}
                to={`/jobs?region=${encodeURIComponent(region)}`}
                className="px-4 py-2 text-sm rounded-full border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                {region}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            <span className="text-red-600">추천</span> 채용공고
          </h2>
          <Link to="/jobs" className="text-sm text-red-600 hover:underline">전체보기 →</Link>
        </div>
        {featuredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>등록된 채용공고가 없습니다.</p>
            <Link to="/jobs/new" className="mt-4 inline-block text-red-600 hover:underline">첫 공고 등록하기</Link>
          </div>
        )}
      </section>

      {/* Grade Info Banners */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 text-white">
              <div className="text-2xl mb-2">⭐</div>
              <h3 className="font-bold text-lg mb-1">프리미엄 채용</h3>
              <p className="text-sm opacity-90">최상단 노출, 더 많은 지원자</p>
            </div>
            <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl p-6 text-white">
              <div className="text-2xl mb-2">💎</div>
              <h3 className="font-bold text-lg mb-1">스페셜 채용</h3>
              <p className="text-sm opacity-90">상단 노출, 강조 표시</p>
            </div>
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl p-6 text-white">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-bold text-lg mb-1">일반 채용</h3>
              <p className="text-sm opacity-90">기본 채용공고 등록</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Community Posts */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            <span className="text-red-600">커뮤니티</span> 최신글
          </h2>
          <Link to="/community/talk" className="text-sm text-red-600 hover:underline">전체보기 →</Link>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          {recentPosts.length > 0 ? recentPosts.map((post, i) => (
            <Link
              key={post.id}
              to={`/community/${post.board_type}/${post.id}`}
              className={`flex items-center justify-between p-4 hover:bg-red-50 transition-colors ${i < recentPosts.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  post.board_type === 'talk' ? 'bg-blue-100 text-blue-600' :
                  post.board_type === 'tip' ? 'bg-green-100 text-green-600' :
                  post.board_type === 'story' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {{ talk: '소통방', tip: '팁', story: '썰', news: '뉴스' }[post.board_type]}
                </span>
                <span className="text-gray-800 text-sm truncate">{post.title}</span>
                {post.comment_count > 0 && (
                  <span className="text-red-500 text-xs flex-shrink-0">[{post.comment_count}]</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0 ml-4">
                <span>{post.author_nickname}</span>
                <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </Link>
          )) : (
            <div className="text-center py-8 text-gray-400">게시글이 없습니다.</div>
          )}
        </div>
      </section>
    </div>
  );
}
