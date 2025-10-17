import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './contexts/PresenceContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DirectoryPage from './pages/DirectoryPage';
import LandingPage from './pages/LandingPage';
import ChatListPage from './pages/ChatListPage';
import ChatPage from './pages/ChatPage';
import PostPage from './pages/PostPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import SuggestionsPage from './pages/SuggestionsPage';
import CommunityListPage from './pages/CommunityListPage';
import CommunityPage from './pages/CommunityPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminVerificationPage from './pages/admin/AdminVerificationPage';
import AdminUserManagementPage from './pages/admin/AdminUserManagementPage';
import AdminCommunityManagementPage from './pages/admin/AdminCommunityManagementPage';
import AdminPostManagementPage from './pages/admin/AdminPostManagementPage';
import FriendsListPage from './pages/FriendsListPage';
import AdminCollegeManagementPage from './pages/admin/AdminCollegeManagementPage';
import EventsListPage from './pages/EventsListPage';
import EventPage from './pages/EventPage';
import CollegeHubPage from './pages/CollegeHubPage';
import AboutPage from './pages/AboutPage';
import AdminTeamManagementPage from './pages/admin/AdminTeamManagementPage';
import FeedbackPage from './pages/FeedbackPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import CommonRoomPage from './pages/CommonRoomPage';
import StudyHubPage from './pages/StudyHubPage';
import GroupChatPage from './pages/GroupChatPage';
import AssignmentPage from './pages/AssignmentPage';


function App() {
  return (
    <Router>
      <AuthProvider>
        <PresenceProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/common-room" element={<CommonRoomPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/find-fellows" element={<DirectoryPage />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
              <Route path="/friends" element={<FriendsListPage />} />
              <Route path="/chat" element={<ChatListPage />} />
              <Route path="/chat/:recipientId" element={<ChatPage />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/communities" element={<CommunityListPage />} />
              <Route path="/community/:id" element={<CommunityPage />} />
              <Route path="/events" element={<EventsListPage />} />
              <Route path="/event/:id" element={<EventPage />} />
              <Route path="/college-hub" element={<CollegeHubPage />} />
              <Route path="/study-hub" element={<StudyHubPage />} />
              <Route path="/group/:id" element={<GroupChatPage />} />
              <Route path="/assignment/:id" element={<AssignmentPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              
              <Route path="/admin" element={<AdminLayout />}>
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="verification" element={<AdminVerificationPage />} />
                  <Route path="users" element={<AdminUserManagementPage />} />
                  <Route path="communities" element={<AdminCommunityManagementPage />} />
                  <Route path="posts" element={<AdminPostManagementPage />} />
                  <Route path="colleges" element={<AdminCollegeManagementPage />} />
                  <Route path="team" element={<AdminTeamManagementPage />} />
                  <Route path="feedback" element={<AdminFeedbackPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PresenceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
