import { useAuth } from '../contexts/AuthContext';
import StudentSearch from './StudentSearch';
import Analytics from './Analytics';
import Layout from './Layout';
import { CalendarDays } from 'lucide-react';

export default function Dashboard() {
  useAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Page Header */}
        <header className="mt-2 animate-[fadeIn_180ms_ease-out]">
          <h1 className="text-3xl font-bold text-gray-900">Student Management System</h1>
          <p className="text-gray-600">Comprehensive insights and performance metrics for the Academic Year.</p>
        </header>

        {/* Instant Student Lookup Card */}
        <section className="rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-100 transition-shadow hover:shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Instant Student Lookup</h2>
                <p className="text-gray-600 text-sm">Search by full register number for exact records</p>
              </div>
              <div className="hidden md:flex items-center space-x-2 opacity-70">
               
              </div>
            </div>
            <StudentSearch />
          </div>
        </section>

        {/* Analytics Section */}
        <section className="animate-[slideFadeIn_200ms_ease-out]">
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-md border border-slate-100 transition-shadow hover:shadow-lg">
            <div className="p-6">
              <Analytics />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
