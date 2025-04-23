import React, { useRef, useState } from "react";
import jsPDF from "jspdf";

export default function NotesPanel() {
  const [notes, setNotes] = useState("");
  const textareaRef = useRef(null);

  const toUpper = () => setNotes(notes.toUpperCase());
  const toLower = () => setNotes(notes.toLowerCase());
  const clear = () => setNotes("");

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text(notes, 10, 10);
    doc.save("notes.pdf");
  };

  return (
    <div className="px-10 py-6 space-y-4 border-l border-gray-300">
      <h2 className="text-xl font-semibold">Notes Panel</h2>
      <textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write your notes here..."
        className="w-full h-60 p-3 border rounded font-mono"
      />
      <div className="flex gap-2">
        <button onClick={toUpper} className="bg-blue-100 px-3 py-1 rounded">
          Uppercase
        </button>
        <button onClick={toLower} className="bg-blue-100 px-3 py-1 rounded">
          Lowercase
        </button>
        <button onClick={clear} className="bg-red-100 px-3 py-1 rounded">
          Clear
        </button>
        <button onClick={generatePDF} className="bg-green-200 px-3 py-1 rounded">
          Download PDF
        </button>
      </div>
    </div>
  );
}
