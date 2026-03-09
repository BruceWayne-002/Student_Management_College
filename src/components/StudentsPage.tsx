import Layout from './Layout';
import StudentSearch from './StudentSearch';

export default function StudentsPage() {
  return (
    <Layout>
      <section className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-100">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Instant Student Lookup</h2>
              <p className="text-gray-600">Search by full register number for exact records</p>
            </div>
            <StudentSearch />
          </div>
        </div>
      </section>
    </Layout>
  );
}
