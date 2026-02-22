import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import type { User } from "../context/AppContext";
import { v4 as uuidv4 } from "uuid";

export default function Lawyers() {
  const { lawyers, addLawyer, deleteLawyer } = useAppContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email) return;

    const newLawyer: User = {
      id: uuidv4(),
      name,
      email,
      role: "lawyer",
      password: name, // as requested
    };

    addLawyer(newLawyer);

    /* reset AFTER adding */
    setName("");
    setEmail("");
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Lawyers</h2>

      {/* ADD FORM */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Lawyer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-1/3"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-1/3"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Lawyer
        </button>
      </form>

      {/* LIST */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Password</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {lawyers.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center p-4">
                No lawyers added yet
              </td>
            </tr>
          ) : (
            lawyers.map((lawyer) => (
              <tr key={lawyer.id}>
                <td className="border p-2">{lawyer.name}</td>
                <td className="border p-2">{lawyer.email}</td>
                <td className="border p-2">{lawyer.password}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteLawyer(lawyer.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
