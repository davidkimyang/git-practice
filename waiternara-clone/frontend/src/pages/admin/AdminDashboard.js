import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const StatCard = ({ label, value, today, color, icon }) => (
  <div className={`bg-white rounded-xl p-5 shadow border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-800">{value?.toLocaleString()}</p>
        {today !== undefined && <p className="text-xs text-gray-400 mt-1">오늘 +{today}</p>}
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    adminAPI.getStats().then(res => setStats(res.data));
    adminAPI.getUsers({ limit: 10 }).then(res => setUsers(res.data.users));
    adminAPI.getJobs({ limit: 10 }).then(res => setJobs(res.data.jobs));
    adminAPI.getPosts({ limit: 10 }).then(res => setPosts(res.data.posts));
  }, [user]);

  const handleToggleUser = async (userId, isActive) => {
    await adminAPI.updateUser(userId, { is_active: !isActive });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive ? 0 : 1 } : u));
  };

  const handleSetRole = async (userId, role) => {
    await adminAPI.updateUser(userId, { role });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const handleToggleJob = async (jobId, isActive) => {
    await adminAPI.updateJob(jobId, { is_active: !isActive });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: isActive ? 0 : 1 } : j));
  };

  const handleSetGrade = async (jobId, grade) => {
    await adminAPI.updateJob(jobId, { grade });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, grade } : j));
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    await adminAPI.deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-red-600">← 메인으로</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="전체 회원" value={stats.totalUsers} today={stats.todayUsers} color="border-blue-500" icon="👥" />
          <StatCard label="채용공고" value={stats.totalJobs} today={stats.todayJobs} color="border-red-500" icon="📋" />
          <StatCard label="게시글" value={stats.totalPosts} today={stats.todayPosts} color="border-green-500" icon="✍️" />
          <StatCard label="댓글" value={stats.totalComments} color="border-yellow-500" icon="💬" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {[['users', '회원 관리'], ['jobs', '채용공고 관리'], ['posts', '게시판 관리']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['ID', '아이디', '닉네임', '이메일', '역할', '상태', '가입일', '관리'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{u.nickname}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e => handleSetRole(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                      <option value="user">일반</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleUser(u.id, u.is_active)}
                      className={`text-xs px-3 py-1 rounded-lg ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {u.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['ID', '제목', '업소명', '지역', '등급', '상태', '조회', '관리'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{j.id}</td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{j.title}</td>
                  <td className="px-4 py-3 text-gray-600">{j.company_name}</td>
                  <td className="px-4 py-3 text-gray-500">{j.region}</td>
                  <td className="px-4 py-3">
                    <select value={j.grade} onChange={e => handleSetGrade(j.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                      <option value="regular">일반</option>
                      <option value="special">스페셜</option>
                      <option value="premium">프리미엄</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${j.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {j.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{j.views}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Link to={`/jobs/${j.id}`} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">보기</Link>
                    <button onClick={() => handleToggleJob(j.id, j.is_active)}
                      className={`text-xs px-2 py-1 rounded ${j.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {j.is_active ? '숨기기' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['ID', '게시판', '제목', '작성자', '상태', '좋아요', '조회', '관리'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{p.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {{ talk: '소통방', tip: '팁', story: '썰', news: '뉴스' }[p.board_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.author_nickname}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? '활성' : '삭제됨'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.likes}</td>
                  <td className="px-4 py-3 text-gray-400">{p.views}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Link to={`/community/${p.board_type}/${p.id}`} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">보기</Link>
                    {p.is_active && (
                      <button onClick={() => handleDeletePost(p.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
