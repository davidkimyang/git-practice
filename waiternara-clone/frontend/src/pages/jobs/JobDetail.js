import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const GRADE_LABELS = { premium: '프리미엄', special: '스페셜', regular: '일반' };
const GRADE_COLORS = {
  premium: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  special: 'text-purple-700 bg-purple-100 border-purple-300',
  regular: 'text-gray-600 bg-gray-100 border-gray-300',
};

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    jobsAPI.getById(id)
      .then(res => {
        if (!res.data?.job) throw new Error('not found');
        setJob(res.data.job);
        setBookmarked(res.data.bookmarked || false);
      })
      .catch(() => navigate('/jobs'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookmark = async () => {
    if (!user) { navigate('/login'); return; }
    const res = await jobsAPI.toggleBookmark(id);
    setBookmarked(res.data.bookmarked);
  };

  const handleDelete = async () => {
    if (!window.confirm('공고를 삭제하시겠습니까?')) return;
    await jobsAPI.delete(id);
    navigate('/jobs');
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>;
  if (!job) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 mb-6">
        ← 채용공고 목록
      </Link>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${GRADE_COLORS[job.grade]}`}>
                  {GRADE_LABELS[job.grade]}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{job.region}</span>
                {job.district && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{job.district}</span>}
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
              <p className="text-lg text-gray-600 mt-1">{job.company_name}</p>
            </div>
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg border text-sm transition-colors ${bookmarked ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600'}`}
            >
              {bookmarked ? '❤️' : '🤍'} {bookmarked ? '저장됨' : '저장'}
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 grid grid-cols-2 gap-4 bg-gray-50 border-b border-gray-100">
          {(job.salary_min || job.salary_max) && (
            <div>
              <p className="text-xs text-gray-500 mb-1">급여</p>
              <p className="font-bold text-red-600 text-lg">
                {job.salary_min ? `${(job.salary_min / 10000).toFixed(0)}만` : ''}
                {job.salary_min && job.salary_max ? ' ~ ' : ''}
                {job.salary_max ? `${(job.salary_max / 10000).toFixed(0)}만원` : ''}
              </p>
            </div>
          )}
          {job.work_hours && (
            <div>
              <p className="text-xs text-gray-500 mb-1">근무시간</p>
              <p className="font-medium text-gray-700">{job.work_hours}</p>
            </div>
          )}
          {job.work_days && (
            <div>
              <p className="text-xs text-gray-500 mb-1">근무일</p>
              <p className="font-medium text-gray-700">{job.work_days}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">조회수</p>
            <p className="font-medium text-gray-700">{job.views}회</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 space-y-6">
          {job.description && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3 text-lg">모집 내용</h2>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3 text-lg">지원 자격</h2>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">{job.requirements}</p>
            </div>
          )}
          {job.benefits && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3 text-lg">복리후생</h2>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">{job.benefits}</p>
            </div>
          )}

          {/* Contact */}
          {(job.contact_phone || job.contact_kakao) && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h2 className="font-bold text-gray-800 mb-3">연락처</h2>
              {job.contact_phone && (
                <a href={`tel:${job.contact_phone}`} className="flex items-center gap-2 text-red-600 font-medium hover:underline mb-2">
                  📞 {job.contact_phone}
                </a>
              )}
              {job.contact_kakao && (
                <p className="flex items-center gap-2 text-yellow-600 font-medium">
                  💬 카카오톡: {job.contact_kakao}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Owner Actions */}
        {user && (user.id === job.user_id || user.role === 'admin') && (
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <Link to={`/jobs/${job.id}/edit`} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">수정</Link>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">삭제</button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        등록일: {new Date(job.created_at).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );
}
