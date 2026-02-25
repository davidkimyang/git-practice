#!/bin/bash

echo "🚀 웨이터나라 클론 시작"

# Start backend
echo "▶ 백엔드 서버 시작 (포트 5000)..."
cd backend
node src/seed.js 2>/dev/null
node src/index.js &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 1
echo "✅ 백엔드 실행 중 (PID: $BACKEND_PID)"

# Start frontend
echo "▶ 프론트엔드 시작 (포트 3000)..."
cd frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ 실행 완료!"
echo "   프론트엔드: http://localhost:3000"
echo "   백엔드 API: http://localhost:5000/api"
echo ""
echo "   테스트 계정:"
echo "   - 일반: testuser / test1234"
echo "   - 관리자: admin / admin1234"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."

wait
