import React, { useState, useRef, useEffect, useMemo } from "react";

const highlightText = (text, query, currentIndex) => {
  if (!query) return [text];

  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);
  let matchCount = 0;

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      const isActive = matchCount === currentIndex;
      matchCount++;
      return (
        <mark
          key={i}
          className={`bg-yellow-300 ${
            isActive ? "ring-2 ring-red-500" : ""
          } rounded px-1`}
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function LogViewer() {
  const [logText, setLogText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");

  const displayRef = useRef(null);
  const textareaRef = useRef(null);

  const matches = useMemo(() => {
    if (!searchQuery) return [];
    const regex = new RegExp(searchQuery, "gi");
    return [...logText.matchAll(regex)];
  }, [searchQuery, logText]);

  const matchCount = matches.length;

  const resetSearch = () => {
    setSearchQuery("");
    setCurrentMatch(0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("text")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogText(event.target.result);
        resetSearch();
      };
      reader.readAsText(file);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentMatch(0);
  };

  const nextMatch = () => {
    if (matchCount > 0) setCurrentMatch((prev) => (prev + 1) % matchCount);
  };

  const prevMatch = () => {
    if (matchCount > 0) setCurrentMatch((prev) => (prev - 1 + matchCount) % matchCount);
  };

  const applyPastedLogs = () => {
    setLogText(modalInput);
    setModalInput("");
    setIsModalOpen(false);
    resetSearch();
  };

  useEffect(() => {
    const activeMark = displayRef.current?.querySelector("mark.ring-2");
    activeMark?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatch]);

  useEffect(() => {
    if (isModalOpen) {
      textareaRef.current?.focus();
    }
  }, [isModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.shiftKey ? prevMatch() : nextMatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchCount]);

  return (
    <div className="px-10 py-6 mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Log Viewer & Search</h1>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="file"
          accept=".txt,.log"
          onChange={handleFileUpload}
          className="text-sm border border-gray-300 rounded px-3 py-1 cursor-pointer file:mr-2 file:py-1 file:px-3 file:border-0 file:bg-blue-500 file:text-white file:rounded hover:file:bg-blue-600"
        />

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          Paste Logs
        </button>

        <input
          type="text"
          placeholder="Search keyword..."
          value={searchQuery}
          onChange={handleSearch}
          className="border border-gray-300 rounded px-3 py-1 text-sm w-full max-w-xs"
        />

        {searchQuery && (
          <button
            onClick={resetSearch}
            className="text-xs text-red-500 underline"
          >
            Clear
          </button>
        )}

        <span className="text-sm text-gray-700">
          {matchCount} match{matchCount !== 1 && "es"}
        </span>

        <button
          onClick={prevMatch}
          disabled={!matchCount}
          className="px-2 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          ←
        </button>
        <button
          onClick={nextMatch}
          disabled={!matchCount}
          className="px-2 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          →
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-lg mb-1">Search Results</h2>
        <div
          className="bg-gray-100 p-4 rounded max-h-[500px] overflow-auto whitespace-pre-wrap font-mono text-sm border"
          ref={displayRef}
        >
          {highlightText(logText, searchQuery, currentMatch)}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4 space-y-4">
            <h2 className="text-lg font-semibold">Paste Your Logs</h2>
            <textarea
              ref={textareaRef}
              rows="10"
              className="w-full border border-gray-300 rounded p-2 font-mono text-sm resize-y"
              placeholder="Paste log data here..."
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={applyPastedLogs}
                className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
