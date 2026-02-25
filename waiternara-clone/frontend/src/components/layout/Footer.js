import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold mb-3">채용공고</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/jobs" className="hover:text-white">전체 채용</Link></li>
              <li><Link to="/jobs?grade=premium" className="hover:text-white">프리미엄 채용</Link></li>
              <li><Link to="/jobs?grade=special" className="hover:text-white">스페셜 채용</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">커뮤니티</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/community/talk" className="hover:text-white">웨이터 소통방</Link></li>
              <li><Link to="/community/tip" className="hover:text-white">웨이터 팁</Link></li>
              <li><Link to="/community/story" className="hover:text-white">웨이터 썰</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">고객센터</h3>
            <ul className="space-y-2 text-sm">
              <li>1544-5688</li>
              <li>평일 09:00 ~ 18:00</li>
              <li>help@waiternara.kr</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">웨이터나라</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">이용약관</a></li>
              <li><a href="#" className="hover:text-white">개인정보처리방침</a></li>
              <li><a href="#" className="hover:text-white">광고 신청</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 text-xs">
          <p className="mb-1">주식회사 웨이터나라 | 대표: 홍길동 | 사업자등록번호: 123-45-67890</p>
          <p className="mb-1">직업정보제공사업신고번호: J1200020240001 | 서울특별시 강남구</p>
          <p className="mt-3">© 2024 웨이터나라. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
