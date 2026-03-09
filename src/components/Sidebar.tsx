import { NavLink } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
    }`;
  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-screen sticky top-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800">Student Management</h1>
          </div>
        </div>
      </div>
      <nav className="p-4 space-y-2">
        <NavLink to="/dashboard" className={linkClass}>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/attendance" className={linkClass}>
          <span>Daily Attendance</span>
        </NavLink>
        <NavLink to="/attendance/monthly" className={linkClass}>
          <span>Monthly Attendance</span>
        </NavLink>
        <NavLink to="/attendance/overall" className={linkClass}>
          <span>Overall Attendance</span>
        </NavLink>
      </nav>
    </aside>
  );
}
