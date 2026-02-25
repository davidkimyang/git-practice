import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', passwordConfirm: '', nickname: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (form.username.length < 4) errs.username = '아이디는 4자 이상이어야 합니다.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = '유효한 이메일을 입력해주세요.';
    if (form.password.length < 6) errs.password = '비밀번호는 6자 이상이어야 합니다.';
    if (form.password !== form.passwordConfirm) errs.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    if (form.nickname.length < 2) errs.nickname = '닉네임은 2자 이상이어야 합니다.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password, nickname: form.nickname, phone: form.phone });
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.message || '회원가입에 실패했습니다.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ name, label, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name} type={type} value={form[name]} onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${errors[name] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="bg-red-600 text-white font-bold text-2xl px-3 py-1 rounded">W</div>
            <span className="font-bold text-2xl text-gray-800">웨이터나라</span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">회원가입</h2>
          <p className="text-sm text-gray-500 mt-1">닉네임은 가입 후 변경이 불가합니다.</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-8">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{errors.general}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field name="username" label="아이디 *" placeholder="영문/숫자 4~20자" />
            <Field name="email" label="이메일 *" type="email" placeholder="example@email.com" />
            <Field name="password" label="비밀번호 *" type="password" placeholder="6자 이상" />
            <Field name="passwordConfirm" label="비밀번호 확인 *" type="password" placeholder="비밀번호를 다시 입력하세요" />
            <Field name="nickname" label="닉네임 * (변경 불가)" placeholder="2~20자 닉네임" />
            <Field name="phone" label="연락처 (선택)" type="tel" placeholder="010-0000-0000" />
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">이미 계정이 있으신가요? </span>
            <Link to="/login" className="text-red-600 font-medium hover:underline">로그인</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
