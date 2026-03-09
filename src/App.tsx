import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AttendancePage from './components/AttendancePage';
import MonthlyAttendancePage from './components/MonthlyAttendancePage';
import OverallAttendancePage from './components/OverallAttendancePage';
import StudentProfileRoute from './components/StudentProfileRoute';
import StudentsPage from './components/StudentsPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  function RequireAuth({ children }: { children: JSX.Element }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return children;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/students"
          element={
            <RequireAuth>
              <StudentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/attendance"
          element={
            <RequireAuth>
              <AttendancePage />
            </RequireAuth>
          }
        />
        <Route
          path="/attendance/monthly"
          element={
            <RequireAuth>
              <MonthlyAttendancePage />
            </RequireAuth>
          }
        />
        <Route
          path="/attendance/overall"
          element={
            <RequireAuth>
              <OverallAttendancePage />
            </RequireAuth>
          }
        />
        <Route
          path="/students/:register_no"
          element={
            <RequireAuth>
              <StudentProfileRoute />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
