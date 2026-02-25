import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { postsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const BOARD_LABELS = { talk: '소통방', tip: '웨이터 팁', story: '썰 게시판', news: '유흥뉴스' };

export default function CommunityDetail() {
  const { boardType, id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    postsAPI.getById(id)
      .then(res => {
        if (!res.data?.post) throw new Error('not found');
        setPost(res.data.post);
        setComments(res.data.comments || []);
        setLiked(res.data.liked || false);
      })
      .catch(() => navigate(`/community/${boardType}`))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    const res = await postsAPI.like(id);
    setLiked(res.data.liked);
    setPost(p => ({ ...p, likes: p.likes + (res.data.liked ? 1 : -1) }));
  };

  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    await postsAPI.delete(id);
    navigate(`/community/${boardType}`);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!comment.trim()) return;
    const res = await postsAPI.addComment(id, comment);
    setComments(prev => [...prev, res.data.comment]);
    setComment('');
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    await postsAPI.deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>;
  if (!post) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/community/${boardType}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 mb-6">
        ← {BOARD_LABELS[boardType] || '게시판'} 목록
      </Link>

      {/* Post */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{BOARD_LABELS[boardType]}</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">{post.title}</h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{post.author_nickname}</span>
            <span>·</span>
            <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
            <span>·</span>
            <span>조회 {post.views}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="text-gray-700 leading-relaxed whitespace-pre-line min-h-24">{post.content}</div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors ${liked ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-200 text-gray-500 hover:border-red-300'}`}
          >
            {liked ? '❤️' : '🤍'} 좋아요 {post.likes}
          </button>
          {user && (user.id === post.user_id || user.role === 'admin') && (
            <div className="flex gap-2">
              <Link to={`/community/${boardType}/${id}/edit`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">수정</Link>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-600">삭제</button>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mt-6 bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-700">댓글 {comments.length}개</h2>
        </div>

        {comments.map(c => (
          <div key={c.id} className="p-4 border-b border-gray-50 last:border-b-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{c.author_nickname}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
              </div>
              {user && (user.id === c.user_id || user.role === 'admin') && (
                <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-600">삭제</button>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-line">{c.content}</p>
          </div>
        ))}

        {/* Comment Form */}
        <div className="p-4 bg-gray-50">
          {user ? (
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
              />
              <button type="submit" className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">등록</button>
            </form>
          ) : (
            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="text-red-600 hover:underline">로그인</Link> 후 댓글을 작성할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
