import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '수원', '울산', '제주', '기타'];
const GRADES = [{ value: 'regular', label: '일반' }, { value: 'special', label: '스페셜' }, { value: 'premium', label: '프리미엄' }];
const JOB_TYPES = [{ value: 'general', label: '일반 서빙' }, { value: 'specialist', label: '전문 웨이터' }];

export default function JobForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '', company_name: '', region: '서울', district: '', job_type: 'general',
    grade: 'regular', salary_type: 'monthly', salary_min: '', salary_max: '',
    work_hours: '', work_days: '', description: '', requirements: '', benefits: '',
    contact_phone: '', contact_kakao: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (isEdit) {
      jobsAPI.getById(id).then(res => {
        const j = res.data.job;
        setForm({
          title: j.title || '', company_name: j.company_name || '', region: j.region || '서울',
          district: j.district || '', job_type: j.job_type || 'general', grade: j.grade || 'regular',
          salary_type: j.salary_type || 'monthly', salary_min: j.salary_min || '', salary_max: j.salary_max || '',
          work_hours: j.work_hours || '', work_days: j.work_days || '', description: j.description || '',
          requirements: j.requirements || '', benefits: j.benefits || '',
          contact_phone: j.contact_phone || '', contact_kakao: j.contact_kakao || '',
        });
      });
    }
  }, [id, user]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.company_name || !form.region) { setError('필수 항목을 모두 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await jobsAPI.update(id, form);
        navigate(`/jobs/${id}`);
      } else {
        const res = await jobsAPI.create(form);
        navigate(`/jobs/${res.data.job.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', required, as }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {as === 'textarea' ? (
        <textarea name={name} value={form[name]} onChange={handleChange} rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
      ) : (
        <input name={name} type={type} value={form[name]} onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{isEdit ? '채용공고 수정' : '채용공고 등록'}</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow border border-gray-100 p-6 space-y-5">
        <Field label="공고 제목" name="title" required />
        <Field label="업소명" name="company_name" required />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">지역 <span className="text-red-500">*</span></label>
            <select name="region" value={form.region} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm bg-white">
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Field label="세부 지역" name="district" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직종</label>
            <select name="job_type" value={form.job_type} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none text-sm bg-white">
              {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">채용 등급</label>
            <select name="grade" value={form.grade} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none text-sm bg-white">
              {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">최소 급여 (원)</label>
            <input name="salary_min" type="number" value={form.salary_min} onChange={handleChange} placeholder="2500000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">최대 급여 (원)</label>
            <input name="salary_max" type="number" value={form.salary_max} onChange={handleChange} placeholder="3500000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
          </div>
        </div>

        <Field label="근무시간 (예: 오후 6시 ~ 새벽 2시)" name="work_hours" />
        <Field label="근무일 (예: 주 5일, 협의)" name="work_days" />
        <Field label="모집 내용" name="description" as="textarea" />
        <Field label="지원 자격" name="requirements" as="textarea" />
        <Field label="복리후생" name="benefits" as="textarea" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="연락처" name="contact_phone" />
          <Field label="카카오톡 ID" name="contact_kakao" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">취소</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-60">
            {loading ? '저장 중...' : isEdit ? '수정 완료' : '공고 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
