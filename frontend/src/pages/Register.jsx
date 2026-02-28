import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../context';
import { Clapperboard } from 'lucide-react';
import toast from 'react-hot-toast';

const roles = [
  { value: 'director', label: 'Director' },
  { value: 'assistant_director', label: 'Assistant Director' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'crew_member', label: 'Crew Member' },
];

const departments = [
  'direction', 'camera', 'lighting', 'sound', 'art', 'costume',
  'makeup', 'production', 'transport', 'catering', 'stunts', 'vfx',
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'crew_member', department: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.department) delete payload.department;
      if (!payload.phone) delete payload.phone;
      const res = await authAPI.register(payload);
      login(res.data.data.user, res.data.data.token);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clapperboard size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Join One Clapper</h1>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input name="name" className="input-field" placeholder="John Doe" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" className="input-field" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input-field" placeholder="+91 XXXXXXXXXX" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input-field" value={form.role} onChange={handleChange}>
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select name="department" className="input-field" value={form.department} onChange={handleChange}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-gray-500 mt-4 text-sm">
            Already have an account? <Link to="/login" className="text-red-500 hover:text-red-400">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
