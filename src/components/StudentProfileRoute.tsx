import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Student } from '../lib/supabase';
import StudentProfilePage from './StudentProfilePage';

export default function StudentProfileRoute() {
  const { register_no } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!register_no) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('register_no', register_no)
        .single();
      if (error) {
        navigate('/dashboard', { replace: true });
        return;
      }
      console.log('STUDENT PROFILE DATA:', data);
      setStudent(data as Student);
      setLoading(false);
    };
    fetchStudent();
  }, [register_no, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center animate-[fadeIn_0.3s_ease-out]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700">Student not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <StudentProfilePage student={student} />;
}
