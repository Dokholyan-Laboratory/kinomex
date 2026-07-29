"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(line: string): string {
  return line
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 text-xs bg-white/10 rounded text-kinome-cyan font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em class="text-slate-300">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-kinome-cyan underline hover:opacity-80">$1</a>');
}

function formatMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inTable = false;
  let tableRows: string[] = [];

  function flushTable() {
    if (!tableRows.length) return;
    const headerCells = tableRows[0].split("|").filter(Boolean);
    const bodyRows = tableRows.slice(2);
    let html = '<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">';
    html += '<thead><tr>';
    for (const cell of headerCells) {
      html += `<th class="px-3 py-2 text-left text-xs font-semibold text-kinome-cyan uppercase tracking-wider border-b border-white/10 bg-white/5">${renderInline(cell.trim())}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (const row of bodyRows) {
      const cells = row.split("|").filter(Boolean);
      if (!cells.length) continue;
      html += '<tr class="border-b border-white/5 hover:bg-white/[0.02]">';
      for (const cell of cells) {
        html += `<td class="px-3 py-2 text-slate-300">${renderInline(cell.trim())}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    out.push(html);
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (raw.startsWith("```")) {
      if (inCode) { inCode = false; out.push("</pre>"); }
      else { inCode = true; out.push('<pre class="my-3 px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed">'); }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(raw) + "\n");
      continue;
    }

    // Table row
    if (raw.startsWith("|") && raw.endsWith("|")) {
      // Separator row (|---|) — skip it, but mark that we're in a table
      if (/^\|[\s:-]+\|$/.test(raw)) {
        if (!inTable) { inTable = true; tableRows = []; }
        continue;
      }
      inTable = true;
      tableRows.push(raw);
      continue;
    } else {
      if (inTable) { flushTable(); inTable = false; }
    }

    // Empty line
    if (!raw.trim()) { out.push('<div class="h-2"></div>'); continue; }

    // Headers
    if (raw.startsWith("### ")) { out.push(`<h4 class="text-sm font-bold text-white mt-4 mb-1">${renderInline(raw.slice(4))}</h4>`); continue; }
    if (raw.startsWith("## ")) { out.push(`<h3 class="text-base font-bold text-white mt-4 mb-1">${renderInline(raw.slice(3))}</h3>`); continue; }
    if (raw.startsWith("# ")) { out.push(`<h2 class="text-lg font-bold text-white mt-4 mb-1">${renderInline(raw.slice(2))}</h2>`); continue; }

    // List item
    if (/^[\-\*]\s/.test(raw)) { out.push(`<li class="text-slate-300 ml-4 list-disc">${renderInline(raw.replace(/^[\-\*]\s/, ""))}</li>`); continue; }

    // Numbered list
    if (/^\d+\.\s/.test(raw)) { out.push(`<li class="text-slate-300 ml-4 list-decimal">${renderInline(raw.replace(/^\d+\.\s/, ""))}</li>`); continue; }

    // Horizontal rule
    if (/^---+\s*$/.test(raw)) { out.push('<hr class="my-4 border-white/10" />'); continue; }

    // Regular paragraph line
    out.push(`<p class="text-sm text-slate-300 leading-relaxed">${renderInline(raw)}</p>`);
  }

  if (inTable) flushTable();
  if (inCode) out.push("</pre>");

  return out.join("\n");
}

const EXAMPLE_PROMPTS = [
  "What are the top kinases by PDIS score?",
  "Which TK family kinases are expressed in the brain?",
  "Tell me about BRAF and its disease associations",
  "What kinases are linked to glioblastoma?",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        let msg = `Chat API error (${res.status})`;
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch {}
        setError(msg);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent },
      ]);
      setStreamingContent("");
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleExample = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setError("");
  }, []);

  const hasMessages = messages.length > 0 || streamingContent;

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
        {hasMessages && (
          <button
            onClick={newChat}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
        {!hasMessages && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kinome-cyan/20 to-kinome-violet/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-kinome-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Ask anything about the human kinome
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleExample(p)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-lg transition-all text-left leading-relaxed"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-kinome-cyan/15 border border-kinome-cyan/20 text-slate-200"
                  : "bg-slate-800/50 border border-white/10 text-slate-300"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="text-sm leading-relaxed prose prose-invert"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </motion.div>
        ))}

        <AnimatePresence>
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-slate-800/50 border border-white/10 text-slate-300">
                <div
                  className="text-sm leading-relaxed prose prose-invert"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent) }}
                />
                <span className="inline-block w-2 h-4 bg-kinome-cyan/60 ml-0.5 animate-pulse rounded-sm" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 max-w-md text-center">
              {error}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about kinases..."
            rows={1}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 bg-transparent outline-none resize-none max-h-32 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 text-sm font-medium text-white bg-kinome-cyan/20 hover:bg-kinome-cyan/30 border border-kinome-cyan/30 rounded-xl backdrop-blur-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
