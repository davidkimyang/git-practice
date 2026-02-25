import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex justify-center items-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-red-600"
      >«</button>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-red-600"
      >‹</button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-red-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
        >{p}</button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-red-600"
      >›</button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-red-600"
      >»</button>
    </div>
  );
}
