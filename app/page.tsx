"use client";
import React, {
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
} from "react";
import axios from "axios";

/* ---------- Icons & UI Utilities ---------- */

const UploadIcon = () => (
  <svg
    className="w-12 h-12 mb-4 text-slate-300 drop-shadow-[0_0_12px_rgba(125,211,252,0.25)]"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 20 16"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
    />
  </svg>
);

const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white/90"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

/* ---------- 1. PDF Ingestion ---------- */

const PdfIngestion: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(active);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      handleDrag(e, false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        if (e.dataTransfer.files[0].type === "application/pdf") {
          setFile(e.dataTransfer.files[0]);
          setStatus(null);
        } else {
          setStatus({ message: "Please drop a PDF file.", type: "error" });
        }
      }
    },
    [handleDrag]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setStatus({ message: "Please select a file to upload.", type: "error" });
      return;
    }

    setIsUploading(true);
    setStatus({ message: "Uploading and processing...", type: "info" });

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post("http://localhost:3001/ingest-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // @ts-ignore
      setStatus({
        // @ts-ignore
        message: response.data.message || "File ingested successfully!",
        type: "success",
      });
      setFile(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Upload failed.";
      setStatus({ message: `Upload failed: ${errorMessage}`, type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden 
    border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Glow accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="text-center mb-8 relative">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent 
        bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 drop-shadow">
          Upload Your Document
        </h1>
        <p className="text-slate-300/80 mt-2">
          Add a PDF to your AI assistant’s knowledge base.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onDragOver={(e) => handleDrag(e, true)}
          onDragEnter={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full h-64 rounded-xl cursor-pointer transition-all
          border ${isDragActive ? "border-cyan-400/80" : "border-white/10"} 
          bg-white/5 hover:bg-white/10 backdrop-blur-lg outline-none ring-1 ring-white/10
          ${isDragActive ? "shadow-[0_0_0_3px_rgba(34,211,238,0.25)]" : ""}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon />
            <p className="mb-1 text-sm text-slate-300/90">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-400">PDF only</p>
            {file && (
              <p className="mt-4 text-sm font-medium text-cyan-300 line-clamp-1 max-w-[80%]">
                {file.name}
              </p>
            )}
          </div>
          <input
            id="pdfFile"
            type="file"
            onChange={handleFileChange}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf"
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="group w-full flex justify-center items-center gap-2 text-white 
          bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 
          focus:outline-none focus:ring-4 focus:ring-cyan-500/40 font-semibold rounded-xl 
          text-sm px-5 py-3 transition-all disabled:from-slate-600 disabled:to-slate-700
          shadow-lg shadow-cyan-500/20"
        >
          {isUploading ? <Spinner /> : null}
          <span className="tracking-wide">
            {isUploading ? "Processing..." : "Upload & Ingest PDF"}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">📤</span>
        </button>
      </form>

      {status && (
        <div
          className={`mt-6 text-center text-sm font-medium ${
            status.type === "success"
              ? "text-emerald-300"
              : status.type === "error"
              ? "text-rose-300"
              : "text-slate-300"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
};

/* ---------- 2. Chat ---------- */

interface Message {
  text: string;
  sender: "user" | "ai";
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:3002/chat", {
        userQuery: input,
      });
      // @ts-ignore
      const aiMessage: Message = { text: response.data.response, sender: "ai" };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessageFromServer = error.response?.data?.error || error.message;
      const errorMessage: Message = {
        text: `Sorry, I ran into an error: ${errorMessageFromServer}`,
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden 
      border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col h-[75vh] relative"
    >
      {/* subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/10" />

      <div className="p-5 border-b border-white/10 relative">
        <h1 className="text-xl font-bold text-slate-100 text-center tracking-wide">
          AI Document Assistant
        </h1>
        <p className="text-center text-slate-400 text-xs mt-1">
          Ask questions grounded in your ingested PDFs
        </p>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm 
              ring-1 ring-white/10
              ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-cyan-600/90 to-blue-700/90 text-white shadow-cyan-500/20"
                  : "bg-white/10 text-slate-100"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-slate-100 rounded-2xl px-4 py-3 ring-1 ring-white/10">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-gradient-to-b from-transparent to-white/5 relative">
        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your document..."
            className="flex-1 p-3 rounded-xl bg-white/10 text-slate-100 placeholder:text-slate-400
            border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
            backdrop-blur-md"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 rounded-xl font-semibold text-white
            bg-gradient-to-r from-fuchsia-600 to-cyan-600
            hover:from-fuchsia-500 hover:to-cyan-500
            disabled:from-slate-600 disabled:to-slate-700
            focus:outline-none focus:ring-4 focus:ring-fuchsia-500/30
            shadow-lg shadow-fuchsia-500/20 transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

/* ---------- Main App ---------- */

export default function App() {
  const [view, setView] = useState<"upload" | "chat">("upload");

  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-10 
      bg-gradient-to-br from-black via-slate-900 to-[#0b0f14] 
      text-slate-200 relative overflow-hidden"
    >
      {/* background aurora blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/3 h-96 w-96 bg-cyan-500/20 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] bg-fuchsia-600/20 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -top-10 -left-10 h-60 w-60 bg-blue-400/10 blur-2xl rounded-full" />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setView("upload")}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ring-1 ring-white/10
              ${view === "upload"
                ? "bg-white/10 text-white shadow-lg shadow-cyan-500/10"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
          >
            Ingest PDF
          </button>
          <button
            onClick={() => setView("chat")}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ring-1 ring-white/10
              ${view === "chat"
                ? "bg-white/10 text-white shadow-lg shadow-fuchsia-500/10"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
          >
            Chat with AI
          </button>
        </div>

        {view === "upload" ? <PdfIngestion /> : <Chat />}
      </div>

      {/* subtle corner grid for depth */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(transparent,black)] opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
    </div>
  );
}

/* ---------- Tailwind Optional: Custom Scrollbar ---------- */
/* Add in globals.css if you want:
.custom-scrollbar::-webkit-scrollbar { width: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 9999px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
*/
