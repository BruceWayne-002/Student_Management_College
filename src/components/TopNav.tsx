import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';
import UserMenu from './UserMenu';

export default function TopNav() {
  const { user, userRole } = useAuth();
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Search students, classes, or reports..."
            className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            readOnly
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
            <Bell className="w-4 h-4 text-gray-700" />
          </button>
          <UserMenu user={user} role={userRole?.role || 'Staff'} />
        </div>
      </div>
    </header>
  );
}
