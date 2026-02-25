import React from 'react';
import { Link } from 'react-router-dom';

const GRADE_LABELS = { premium: '프리미엄', special: '스페셜', regular: '일반' };
const GRADE_COLORS = {
  premium: 'text-yellow-600 bg-yellow-100 border border-yellow-300',
  special: 'text-purple-600 bg-purple-100 border border-purple-300',
  regular: 'text-gray-600 bg-gray-100 border border-gray-300',
};
const REGION_COLORS = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];

export default function JobCard({ job }) {
  const colorIdx = job.region ? job.region.charCodeAt(0) % REGION_COLORS.length : 0;

  return (
    <Link to={`/jobs/${job.id}`} className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow border border-gray-100 p-5 hover:-translate-y-0.5 transform transition-transform">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[job.grade] || GRADE_COLORS.regular}`}>
          {GRADE_LABELS[job.grade] || '일반'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${REGION_COLORS[colorIdx]}`}>
          {job.region}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{job.title}</h3>
      <p className="text-sm text-gray-500 mb-3">{job.company_name}</p>
      {(job.salary_min || job.salary_max) && (
        <p className="text-sm font-semibold text-red-600 mb-2">
          {job.salary_min ? `${(job.salary_min / 10000).toFixed(0)}만` : ''}
          {job.salary_min && job.salary_max ? ' ~ ' : ''}
          {job.salary_max ? `${(job.salary_max / 10000).toFixed(0)}만원` : ''}
        </p>
      )}
      {job.work_hours && <p className="text-xs text-gray-400">⏰ {job.work_hours}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400">조회 {job.views || 0}</span>
        <span className="text-xs text-gray-400">{new Date(job.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
    </Link>
  );
}
