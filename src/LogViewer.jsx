import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { VariableSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { debounce } from "lodash";

const highlightText = (text, query, highlights = [], currentMatchGlobalIndex, lineIndex, flatMatches) => {
  if (!query || highlights.length === 0) return [<span key="plain">{text}</span>];

  const parts = [];
  let lastIndex = 0;

  highlights.forEach((match) => {
    const [start, end] = match;
    const globalMatchIndex = flatMatches.findIndex(
      (m) => m.line === lineIndex && m.range[0] === start && m.range[1] === end
    );
    const isFocused = globalMatchIndex === currentMatchGlobalIndex;

    if (start > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, start)}</span>);
    }

    parts.push(
      <mark
        key={start}
        className={`bg-yellow-300 ${isFocused ? "ring-2 ring-red-500" : ""} rounded px-1`}
      >
        {text.slice(start, end)}
      </mark>
    );
    lastIndex = end;
  });

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return parts;
};

export default function LogViewer() {
  const [logText, setLogText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uniqueErrors, setUniqueErrors] = useState([]);
  const [uniqueDebug, setUniqueDebug] = useState([]);

  const textareaRef = useRef(null);
  const listRef = useRef();

  const lines = useMemo(() => logText.split("\n"), [logText]);

  const { matchesPerLine, flatMatches } = useMemo(() => {
    const matchesPerLine = {};
    const flatMatches = [];

    if (!searchQuery) return { matchesPerLine, flatMatches };

    lines.forEach((line, lineIndex) => {
      const regex = new RegExp(searchQuery, "gi");
      const lineMatches = [...line.matchAll(regex)].map((m) => [m.index, m.index + m[0].length]);
      if (lineMatches.length) {
        matchesPerLine[lineIndex] = lineMatches;
        lineMatches.forEach((range) => flatMatches.push({ line: lineIndex, range }));
      }
    });

    return { matchesPerLine, flatMatches };
  }, [lines, searchQuery]);

  const matchCount = flatMatches.length;

  const resetSearch = () => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isTextFile = file.type.startsWith("text") || file.name.endsWith(".log") || file.name.endsWith(".txt");
      if (isTextFile) {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          setLogText(content);
          extractUniqueErrors(content);
          resetSearch();
          setLoading(false);
        };
        reader.readAsText(file);
      } else {
        alert("Please upload a valid text or log file.");
      }
    }
  };

  const extractUniqueErrors = (text) => {
    const logs = text.split("\n");
    const errorMessages = new Map();
    const debugMessages = new Map();
  
    // Keywords that imply error/failure context in debug logs
    const failureKeywords = ['error', 'ERROR', 'Error', 'FAILURE', 'Failed', 'failure', 'failed'];
  
    logs.forEach((line) => {
      try {
        // Attempt to extract JSON object from a line
        let json = JSON.parse(line.replace(/^.*?({.*})$/, "$1"));
  
        // If the log object has a nested stringified JSON under `log`, parse it
        if (json.log) {
          try {
            json = JSON.parse(json.log);
          } catch (e) {
            return; // Skip malformed nested logs
          }
        }
  
        const level = json.level;
        const message = json.message;
  
        if (!message) return;
  
        const firstThreeWords = message.split(/\s+/).slice(0, 3).join(" ");
  
        if (level === "ERROR") {
          if (!errorMessages.has(firstThreeWords)) {
            errorMessages.set(firstThreeWords, JSON.stringify(json, null, 2));
          }
        } else if (level === "DEBUG") {
          // Include DEBUG messages only if they contain keywords indicating a problem
          const containsFailureKeyword = failureKeywords.some((keyword) =>
            message.includes(keyword)
          );
  
          if (containsFailureKeyword && !debugMessages.has(firstThreeWords)) {
            debugMessages.set(firstThreeWords, JSON.stringify(json, null, 2));
          }
        }
      } catch (e) {
        // Fail silently for non-JSON lines
      }
    });
  
    // Set the unique messages for rendering
    setUniqueErrors(Array.from(errorMessages.values()));
    setUniqueDebug(Array.from(debugMessages.values()));
  };
  
  
  
  
  

  const debouncedSearch = useMemo(() => debounce((value) => {
    setSearchQuery(value);
    setCurrentMatchIndex(0);
  }, 300), []);

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const nextMatch = () => {
    if (matchCount > 0) {
      const newIndex = (currentMatchIndex + 1) % matchCount;
      setCurrentMatchIndex(newIndex);
    }
  };

  const prevMatch = () => {
    if (matchCount > 0) {
      const newIndex = (currentMatchIndex - 1 + matchCount) % matchCount;
      setCurrentMatchIndex(newIndex);
    }
  };

  const applyPastedLogs = () => {
    setLogText(modalInput);
    extractUniqueErrors(modalInput);
    setModalInput("");
    setIsModalOpen(false);
    resetSearch();
  };

  useEffect(() => {
    if (searchQuery && flatMatches[currentMatchIndex]) {
      listRef.current?.scrollToItem(flatMatches[currentMatchIndex].line, "center");
    }
  }, [searchQuery, currentMatchIndex, flatMatches]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        nextMatch();
      } else if (e.key === "ArrowLeft") {
        prevMatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchCount, currentMatchIndex]);

  const getItemSize = useCallback(
    (index) => {
      const lineLength = lines[index]?.length || 0;
      return Math.max(20, Math.ceil(lineLength / 100) * 24);
    },
    [lines]
  );

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
          onChange={handleSearchChange}
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
          {matchCount > 0 ? `Match ${currentMatchIndex + 1} of ${matchCount}` : "No matches"}
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

      <div className="bg-gray-100 rounded max-h-[500px] h-[500px] overflow-hidden border font-mono text-sm">
        {loading ? (
          <div className="text-gray-500 italic p-4">Loading...</div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                itemCount={lines.length}
                itemSize={getItemSize}
                width={width}
              >
                {({ index, style }) => (
                  <div style={style} className="whitespace-pre-wrap px-4 py-1">
                    {highlightText(
                      lines[index],
                      searchQuery,
                      matchesPerLine[index] || [],
                      currentMatchIndex,
                      index,
                      flatMatches
                    )}
                  </div>
                )}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

      {uniqueErrors.length > 0 && (
        <div className="bg-white rounded border p-4 mt-6">
            <h2 className="text-lg font-semibold mb-2">Unique Error Types</h2>
            {uniqueErrors.map((error, i) => {
            const parsed = JSON.parse(error);
            const errorTitle = parsed.message || `Error ${i + 1}`;

            return (
                <details key={i} className="mb-4 border rounded overflow-hidden">
                <summary className="cursor-pointer bg-gray-200 px-4 py-2 font-medium text-sm hover:bg-gray-300">
                    {errorTitle}
                </summary>
                <pre className="bg-gray-50 p-4 text-sm overflow-auto whitespace-pre-wrap font-mono">
                    {error}
                </pre>
                </details>
            );
            })}
        </div>
        )}

        {uniqueDebug.length > 0 && (
        <div className="bg-white rounded border p-4 mt-6">
            <h2 className="text-lg font-semibold mb-2">Unique Debug Types</h2>
            {uniqueDebug.map((debug, i) => {
            const parsed = JSON.parse(debug);
            const debugTitle = parsed.message || `Debug ${i + 1}`;
            return (
                <details key={i} className="mb-4 border rounded overflow-hidden">
                <summary className="cursor-pointer bg-gray-200 px-4 py-2 font-medium text-sm hover:bg-gray-300">
                    {debugTitle}
                </summary>
                <pre className="bg-gray-50 p-4 text-sm overflow-auto whitespace-pre-wrap font-mono">
                    {debug}
                </pre>
                </details>
            );
            })}
        </div>
        )}


      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4">
            <h2 className="text-xl font-bold mb-4">Paste Logs</h2>
            <textarea
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              className="w-full h-64 border p-2 font-mono text-sm rounded"
            />
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={applyPastedLogs}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
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
