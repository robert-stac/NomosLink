import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully! You can now log in.");
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Set New Password</h2>
        <p className="text-slate-500 text-sm mb-6">Choose a secure password for your NomosLink account.</p>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={newPassword}
            required
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}