import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { postsAPI } from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_POSTS } from '../../utils/mockData';

const BOARDS = {
  talk: { label: '웨이터 소통방', emoji: '💬', desc: '자유롭게 소통하는 공간' },
  tip: { label: '웨이터 팁', emoji: '💡', desc: '유용한 업무 팁 공유' },
  story: { label: '웨이터 썰', emoji: '📖', desc: '재미있는 경험담 공유' },
  news: { label: '유흥뉴스', emoji: '📰', desc: '업계 최신 뉴스' },
};

export default function CommunityList() {
  const { boardType } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  const page = parseInt(searchParams.get('page')) || 1;
  const board = BOARDS[boardType] || BOARDS.talk;

  useEffect(() => {
    setLoading(true);
    postsAPI.getAll({ board_type: boardType, page, limit: 15, search: searchParams.get('search') })
      .then(res => {
        const posts = res.data?.posts;
        if (!Array.isArray(posts)) throw new Error('invalid');
        setPosts(posts);
        setTotal(res.data?.total || posts.length);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch(() => {
        const filtered = MOCK_POSTS.filter(p => p.board_type === boardType);
        setPosts(filtered);
        setTotal(filtered.length);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [boardType, searchParams.toString()]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = { search };
    if (search) setSearchParams(params); else setSearchParams({});
  };

  const setPage = (p) => {
    const params = Object.fromEntries(searchParams);
    params.page = p;
    setSearchParams(params);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Board Nav */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Object.entries(BOARDS).map(([key, b]) => (
          <Link key={key} to={`/community/${key}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${boardType === key ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'}`}>
            {b.emoji} {b.label}
          </Link>
        ))}
      </div>

      {/* Board Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{board.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{board.label}</h1>
            <p className="text-sm text-gray-500">{board.desc}</p>
          </div>
        </div>
      </div>

      {/* Search & Write */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
          <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">검색</button>
        </form>
        {user && (
          <Link to={`/community/${boardType}/new`}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap">
            글쓰기
          </Link>
        )}
      </div>

      {/* Post List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
          <span className="col-span-7">제목</span>
          <span className="col-span-2 text-center">작성자</span>
          <span className="col-span-1 text-center">조회</span>
          <span className="col-span-2 text-right">날짜</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">불러오는 중...</div>
        ) : posts.length > 0 ? posts.map(post => (
          <Link key={post.id} to={`/community/${post.board_type}/${post.id}`}
            className="grid grid-cols-12 px-4 py-3 border-b border-gray-50 hover:bg-red-50 transition-colors items-center">
            <div className="col-span-7 flex items-center gap-2">
              <span className="text-sm text-gray-800 truncate">{post.title}</span>
              {post.comment_count > 0 && (
                <span className="text-xs text-red-500 font-medium flex-shrink-0">[{post.comment_count}]</span>
              )}
            </div>
            <span className="col-span-2 text-center text-xs text-gray-500 truncate">{post.author_nickname}</span>
            <span className="col-span-1 text-center text-xs text-gray-400">{post.views}</span>
            <span className="col-span-2 text-right text-xs text-gray-400">
              {new Date(post.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
            </span>
          </Link>
        )) : (
          <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">{board.emoji}</div>
            <p>게시글이 없습니다.</p>
            {user && <Link to={`/community/${boardType}/new`} className="mt-2 inline-block text-red-600 hover:underline text-sm">첫 글 작성하기</Link>}
          </div>
        )}
      </div>

      <div className="mt-1 text-xs text-right text-gray-400">총 {total}건</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
