import { useState, useRef } from "react";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "../context/AppContext";

export default function AddUser() {
  // Ensure setUsers is destuctured here from your context
  const { addUser, users, deleteUser, setUsers } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"lawyer" | "clerk" | "accountant" | "manager">("lawyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- BACKUP LOGIC ---
  const downloadBackup = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `staff_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // --- RESTORE LOGIC ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedUsers = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedUsers)) {
          if (window.confirm(`Found ${importedUsers.length} users. Overwrite current list?`)) {
            if (setUsers) {
                setUsers(importedUsers);
                alert("Data restored!");
            } else {
                alert("Error: setUsers function not found in AppContext.");
            }
          }
        }
      } catch (err) {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return alert("Fill all fields");
    
    setLoading(true);
    setMessage("");

    try {
      // 1. Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // 2. Create new user object
      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        role,
      };

      // 3. Save to Supabase
      const { data, error } = await supabase
        .from("users")
        .insert([newUser])
        .select();

      if (error) throw error;

      // 4. Add to local state using context
      addUser(newUser);

      // 5. Clear form and show success
      setName("");
      setEmail("");
      setPassword("");
      setRole("lawyer");
      setMessage(`✓ ${name} added successfully!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message}`);
      console.error("Add user error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 mt-10">
      
      {/* HEADER WITH BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-50">
        <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Staff Management</h2>
            <p className="text-slate-400 text-xs font-medium">Add or Restore firm members</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* HIDDEN INPUT */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          
          {/* RESTORE BUTTON */}
          <button 
            onClick={handleImportClick}
            className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Restore
          </button>

          {/* BACKUP BUTTON */}
          <button 
            onClick={downloadBackup}
            className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Backup
          </button>
        </div>
      </div>

      {/* MESSAGE DISPLAY */}
      {message && (
        <div className={`p-3 rounded-lg mb-4 text-sm font-semibold ${message.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* FORM SECTION */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
            <input
            className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            />

            <input
            className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />

            <input
            type="password"
            className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />

            <select
            className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            >
            <option value="lawyer">Lawyer</option>
            <option value="clerk">Clerk</option>
            <option value="accountant">Accountant</option>
            <option value="manager">Legal Manager</option>
            </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl w-full transition-all shadow-xl shadow-blue-200 mt-2"
        >
          {loading ? "Adding..." : "Add Staff Member"}
        </button>
      </form>

      {/* TABLE SECTION */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Active Directory</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{users.length} TOTAL</span>
        </div>
        
        <div className="overflow-hidden rounded-[24px] border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold">
                <th className="p-4 text-left">Staff Name</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.filter(u => u.role !== 'admin').map((u) => (
                <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="capitalize text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {u.role === 'manager' ? 'Manager' : u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => window.confirm(`Remove ${u.name}?`) && deleteUser(u.id)}
                      className="text-slate-300 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}