import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { v4 as uuidv4 } from "uuid";

interface Props {
  caseId: string;
}

export default function ProgressNoteInput({ caseId }: Props) {
  const { currentUser, addCourtCaseProgress } = useAppContext();
  const [message, setMessage] = useState("");

  // 🚫 Safety guard
  if (!currentUser) return null;

  // ❗ Only lawyers can add notes
  if (currentUser.role !== "lawyer") {
    return (
      <p className="text-xs text-gray-500 italic mt-2">
        Only the assigned lawyer can add progress notes.
      </p>
    );
  }

  const handleSubmit = () => {
    if (!message.trim()) return;

    addCourtCaseProgress(caseId, {
      id: uuidv4(),
      message: message.trim(),
      author: currentUser.name,
      date: new Date().toLocaleString(),
    });

    setMessage("");
  };

  return (
    <div className="mt-3">
      <textarea
        className="w-full border rounded p-2 text-sm"
        rows={3}
        placeholder="Add progress note..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}   // ✅ THIS WAS MISSING / BROKEN
      />

      <button
        onClick={handleSubmit}
        className="mt-2 bg-[#0B1F3A] text-white px-3 py-1 rounded text-sm hover:bg-[#09203b]"
      >
        Add Note
      </button>
    </div>
  );
}
