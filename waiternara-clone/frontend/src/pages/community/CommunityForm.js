import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { postsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const BOARD_LABELS = { talk: '소통방', tip: '웨이터 팁', story: '웨이터 썰', news: '유흥뉴스' };

export default function CommunityForm() {
  const { boardType, id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', content: '', board_type: boardType || 'talk' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (isEdit) {
      postsAPI.getById(id).then(res => {
        const p = res.data.post;
        setForm({ title: p.title, content: p.content, board_type: p.board_type });
      });
    }
  }, [id, user]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setError('제목과 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await postsAPI.update(id, { title: form.title, content: form.content });
        navigate(`/community/${boardType}/${id}`);
      } else {
        const res = await postsAPI.create(form);
        navigate(`/community/${res.data.post.board_type}/${res.data.post.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? '게시글 수정' : `${BOARD_LABELS[boardType] || '게시판'} 글쓰기`}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow border border-gray-100 p-6 space-y-5">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">게시판</label>
            <select name="board_type" value={form.board_type} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm bg-white">
              {Object.entries(BOARD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목 <span className="text-red-500">*</span></label>
          <input name="title" value={form.title} onChange={handleChange}
            placeholder="제목을 입력하세요" maxLength={200}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용 <span className="text-red-500">*</span></label>
          <textarea name="content" value={form.content} onChange={handleChange} rows={10}
            placeholder="내용을 입력하세요..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">취소</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-60">
            {loading ? '저장 중...' : isEdit ? '수정 완료' : '게시글 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
