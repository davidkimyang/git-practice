import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import JobList from './pages/jobs/JobList';
import JobDetail from './pages/jobs/JobDetail';
import JobForm from './pages/jobs/JobForm';
import CommunityList from './pages/community/CommunityList';
import CommunityDetail from './pages/community/CommunityDetail';
import CommunityForm from './pages/community/CommunityForm';
import AdminDashboard from './pages/admin/AdminDashboard';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? children : <Navigate to="/" />;
}

function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/jobs" element={<JobList />} />
            <Route path="/jobs/new" element={<PrivateRoute><JobForm /></PrivateRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/edit" element={<PrivateRoute><JobForm /></PrivateRoute>} />

            <Route path="/community" element={<Navigate to="/community/talk" />} />
            <Route path="/community/:boardType" element={<CommunityList />} />
            <Route path="/community/:boardType/new" element={<PrivateRoute><CommunityForm /></PrivateRoute>} />
            <Route path="/community/:boardType/:id" element={<CommunityDetail />} />
            <Route path="/community/:boardType/:id/edit" element={<PrivateRoute><CommunityForm /></PrivateRoute>} />

            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            <Route path="*" element={
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">페이지를 찾을 수 없습니다</h2>
                <a href="/" className="text-red-600 hover:underline">홈으로 돌아가기</a>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
