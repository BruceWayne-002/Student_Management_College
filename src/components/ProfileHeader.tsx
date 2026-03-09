import { Student } from '../lib/supabase';
import { User, Edit, Download, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';

interface Props {
  student: Student;
  attendance: number | null;
}

export default function ProfileHeader({ student, attendance }: Props) {
  const navigate = useNavigate();
  const badge = student.register_no || '—';
  const percText = attendance === null ? '—' : `${Math.round(attendance)}%`;
  const ringColor =
    Number(attendance ?? 0) >= 75
      ? '#16a34a'
      : Number(attendance ?? 0) >= 65
      ? '#f59e0b'
      : '#f59e0b';
  const pct = Math.min(Math.max(Number(attendance ?? 0), 0), 100);
  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text('STUDENT PROFILE', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(11);
    doc.text(`Name: ${student.name || '—'}`, 20, y); y += 6;
    doc.text(`Register No: ${student.register_no || '—'}`, 20, y); y += 6;
    doc.text(`Department: ${student.department || '—'}`, 20, y); y += 6;
    doc.text(`Class/Year: ${student.class || '—'} / ${student.year || '—'}`, 20, y); y += 6;
    doc.text(`Father: ${student.father_name || '—'}`, 20, y); y += 6;
    doc.text(`Mother: ${student.mother_name || '—'}`, 20, y); y += 6;
    doc.text(`Address: ${student.address || '—'}`, 20, y); y += 6;
    doc.text(`Email: ${student.email || '—'}`, 20, y); y += 6;
    doc.text(`Phone: ${student.phone_number || '—'}`, 20, y); y += 6;
    doc.text(`Present: ${student.present_today ?? '—'}`, 20, y); y += 6;
    doc.text(`Leave: ${student.leave_taken ?? '—'}`, 20, y); y += 6;
    doc.save(`${student.register_no}_profile.pdf`);
  };

  return (
    <div className="backdrop-blur-md bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-slate-200/60">
      <div className="px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-green-200 via-green-300 to-green-400 p-4 rounded-full">
              {student.profile_image_url ? (
                <img
                  src={student.profile_image_url}
                  alt={student.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-700" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
                {student.name || '—'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active Student</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-slate-900/10 text-slate-800 px-2 py-0.5 rounded text-xs font-mono">
                  {badge}
                </span>
                <span className="text-slate-500 text-sm">{student.department || '—'}</span>
              </div>
              <p className="text-slate-500 text-sm">{(student.class || '—')} • {(student.year || '—')} Year</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: attendance === null
                    ? 'conic-gradient(#e5e7eb 0%, #e5e7eb 100%)'
                    : `conic-gradient(${ringColor} ${pct}%, #e5e7eb ${pct}%)`,
                }}
              />
              <div className="absolute inset-2 rounded-full bg-white/90 backdrop-blur flex items-center justify-center">
                <span className="text-xl font-bold text-slate-800">{percText}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => navigate('/dashboard')} className="px-3 py-2 bg-white/80 border border-slate-200 rounded-lg hover:bg-white transition flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4 text-slate-700" />
                <span className="text-sm text-slate-700">Back to Dashboard</span>
              </button>
              <button className="px-3 py-2 bg-white/80 border border-slate-200 rounded-lg hover:bg-white transition flex items-center space-x-2">
                <Edit className="w-4 h-4 text-slate-700" />
                <span className="text-sm text-slate-700">Edit Profile</span>
              </button>
              <button onClick={exportPDF} className="px-3 py-2 bg-white/80 border border-slate-200 rounded-lg hover:bg-white transition flex items-center space-x-2">
                <Download className="w-4 h-4 text-slate-700" />
                <span className="text-sm text-slate-700">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
