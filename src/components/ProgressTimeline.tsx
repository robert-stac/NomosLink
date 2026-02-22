import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import type { ProgressNote } from "../context/AppContext";

export default function ProgressTimeline({
  notes,
  caseId,
}: {
  notes: ProgressNote[];
  caseId: string;
}) {
  const { currentUser, editCourtCaseProgress, deleteCourtCaseProgress } =
    useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  if (!notes || notes.length === 0)
    return <p className="text-sm text-gray-500">No progress yet.</p>;

  return (
    <div className="mt-3 space-y-3">
      {notes.map((note) => {
        const isOwner = currentUser?.id === note.authorId;
        const canEdit =
          isOwner && currentUser?.role !== "admin";

        return (
          <div key={note.id} className="border-l-2 pl-3">
            <div className="text-xs text-gray-500">
              {note.authorName} • {note.authorRole} • {note.date}
            </div>

            {editingId === note.id ? (
              <>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border rounded p-2 text-sm mt-1"
                />

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      editCourtCaseProgress(
                        caseId,
                        note.id,
                        editText
                      );
                      setEditingId(null);
                    }}
                    className="text-green-600 text-xs"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">{note.message}</p>

                {canEdit && (
                  <div className="flex gap-3 text-xs mt-1">
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditText(note.message);
                      }}
                      className="text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        confirm("Delete this note?")
                          ? deleteCourtCaseProgress(
                              caseId,
                              note.id
                            )
                          : null
                      }
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
