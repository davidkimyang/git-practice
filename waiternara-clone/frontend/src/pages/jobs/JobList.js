import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { jobsAPI } from '../../utils/api';
import JobCard from '../../components/common/JobCard';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../contexts/AuthContext';

const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '수원', '울산', '제주'];
const GRADES = [
  { value: '', label: '전체' },
  { value: 'premium', label: '프리미엄' },
  { value: 'special', label: '스페셜' },
  { value: 'regular', label: '일반' },
];

export default function JobList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const { user } = useAuth();

  const region = searchParams.get('region') || '';
  const grade = searchParams.get('grade') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  const fetchJobs = () => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (region) params.region = region;
    if (grade) params.grade = grade;
    if (searchParams.get('search')) params.search = searchParams.get('search');

    jobsAPI.getAll(params)
      .then(res => {
        setJobs(res.data.jobs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, [searchParams.toString()]);

  const setParam = (key, value) => {
    const params = Object.fromEntries(searchParams);
    if (value) params[key] = value; else delete params[key];
    delete params.page;
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setParam('search', search);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">채용공고</h1>
          <p className="text-sm text-gray-500 mt-1">총 {total}건의 채용공고</p>
        </div>
        {user && (
          <Link to="/jobs/new" className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 font-medium transition-colors">
            + 공고 등록
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="업소명, 지역, 직종 검색..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
        />
        <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">검색</button>
      </form>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">지역</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setParam('region', r === '전체' ? '' : r)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  (r === '전체' && !region) || region === r
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
                }`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">채용 등급</p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map(g => (
              <button
                key={g.value}
                onClick={() => setParam('grade', g.value)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  grade === g.value
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
                }`}
              >{g.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg">해당 조건의 채용공고가 없습니다.</p>
          {user && <Link to="/jobs/new" className="mt-4 inline-block text-red-600 hover:underline">첫 공고 등록하기</Link>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={p => setParam('page', p)} />
    </div>
  );
}
