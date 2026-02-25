import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinks = [
    { to: '/jobs', label: '채용공고' },
    { to: '/community/talk', label: '소통방' },
    { to: '/community/tip', label: '웨이터 팁' },
    { to: '/community/story', label: '썰 게시판' },
    { to: '/community/news', label: '유흥뉴스' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary text-white font-bold text-xl px-3 py-1 rounded">W</div>
            <span className="font-bold text-xl text-gray-800">웨이터나라</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${isActive(link.to) ? 'text-red-600 font-bold' : 'text-gray-600 hover:text-red-600'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm text-purple-600 font-medium hover:text-purple-800">관리자</Link>
                )}
                <span className="text-sm text-gray-600">{user.nickname || user.username}님</span>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-red-600">로그인</Link>
                <Link to="/register" className="text-sm bg-primary text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors">
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className="block py-2 text-gray-700 hover:text-red-600">{link.label}</Link>
            ))}
            <div className="pt-2 border-t mt-2">
              {user ? (
                <>
                  <span className="block py-1 text-sm text-gray-600">{user.nickname}님</span>
                  {user.role === 'admin' && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-1 text-purple-600">관리자 페이지</Link>}
                  <button onClick={handleLogout} className="block py-1 text-red-600">로그아웃</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-1 text-gray-700">로그인</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-1 text-red-600 font-medium">회원가입</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
