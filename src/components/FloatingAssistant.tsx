"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, AlertCircle, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "./UserAvatar";
import FeedbackModal from "./FeedbackModal";
import { useSound } from "@/hooks/useSound";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Message {
  role: "user" | "ai";
  content: string;
}

const DAILY_LIMIT = 10;

export default function FloatingAssistant() {
  const { paperinoAvatar } = useAuth();
  const { playPop } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! I'm Paperino AI. How can I help you with your studies today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLeft, setMessagesLeft] = useState(DAILY_LIMIT);
  const [systemOffline, setSystemOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and check usage limit & system status
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ai"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemOffline(data.aiStatus === "offline");
      }
    });

    const checkUsage = async () => {
      const today = new Date().toISOString().split("T")[0];
      const usageData = localStorage.getItem("paperino_ai_usage");
      
      if (usageData) {
        const parsed = JSON.parse(usageData);
        if (parsed.date === today) {
          setMessagesLeft(Math.max(0, DAILY_LIMIT - parsed.count));
        } else {
          // Reset for new day
          localStorage.setItem("paperino_ai_usage", JSON.stringify({ date: today, count: 0 }));
          setMessagesLeft(DAILY_LIMIT);
        }
      } else {
        localStorage.setItem("paperino_ai_usage", JSON.stringify({ date: today, count: 0 }));
        setMessagesLeft(DAILY_LIMIT);
      }
    };
    checkUsage();
    return () => unsub();
  }, []);

  // Listen for open-ai-chat event
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("open-ai-chat", handleOpenChat);
    return () => window.removeEventListener("open-ai-chat", handleOpenChat);
  }, []);

  const incrementUsage = () => {
    const today = new Date().toISOString().split("T")[0];
    const usageData = localStorage.getItem("paperino_ai_usage");
    let count = 0;
    
    if (usageData) {
      const parsed = JSON.parse(usageData);
      if (parsed.date === today) {
        count = parsed.count;
      }
    }
    
    count += 1;
    localStorage.setItem("paperino_ai_usage", JSON.stringify({ date: today, count }));
    setMessagesLeft(Math.max(0, DAILY_LIMIT - count));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading || messagesLeft <= 0) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages(prev => [...prev, { role: "ai", content: data.text }]);
      incrementUsage();

    } catch (err: any) {
      setMessages(prev => [...prev, { role: "ai", content: "Oops! " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 md:bottom-12 right-4 md:right-8 z-[9999] flex flex-col items-center gap-3">
        
        {/* Feedback Button */}
        <button
          onClick={() => { setIsFeedbackOpen(true); playPop(); }}
          className="relative group w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-110 bg-[#0f0a1a] border border-violet-500/30 text-violet-400 hover:text-white"
          title="Send Feedback"
        >
          <MessageCircle size={20} />
        </button>

        {/* AI Chatbot Button */}
        <button
          onClick={() => { setIsOpen(!isOpen); if (!isOpen) playPop(); }}
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] hover:scale-110 ${isOpen ? 'bg-rose-500 hover:bg-rose-600' : 'bg-gradient-to-tr from-violet-600 to-fuchsia-500'}`}
        >
          {isOpen ? <X className="text-white" size={24} /> : <MessageSquare className="text-white" size={24} />}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-[88px] md:bottom-[120px] right-4 md:right-8 w-[min(350px,calc(100vw-32px))] sm:w-[400px] h-[500px] max-h-[calc(100vh-120px)] bg-[#0a0714]/95 backdrop-blur-3xl rounded-3xl border border-violet-500/20 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-500/20 blur-md animate-pulse"></div>
                <Bot className="text-violet-400 relative z-10" size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-1">Paperino AI <Sparkles size={12} className="text-fuchsia-400"/></h3>
                <p className="text-xs text-violet-300/60">SRM Student Assistant</p>
              </div>
            </div>
            <div className="text-[10px] font-bold tracking-widest uppercase bg-white/5 px-2 py-1 rounded-md text-gray-400 flex items-center gap-1 border border-white/10">
              <AlertCircle size={10} className={messagesLeft > 0 ? "text-emerald-400" : "text-rose-400"} />
              {messagesLeft} Left
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "user" ? (
                    <UserAvatar avatarId={paperinoAvatar} size={14} className="w-8 h-8 flex-shrink-0 mt-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-[color:var(--primary-500)]/20 text-[color:var(--primary-400)]">
                      <Bot size={14} />
                    </div>
                  )}
                  <div 
                    className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-fuchsia-600/20 text-fuchsia-100 rounded-tr-sm border border-fuchsia-500/20" : "bg-white/5 text-gray-200 rounded-tl-sm border border-white/5 whitespace-pre-wrap"}`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-violet-500/20 text-violet-400">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl text-sm bg-white/5 text-gray-400 rounded-tl-sm border border-white/5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/5 bg-[#050308]">
            {systemOffline ? (
              <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center justify-center gap-2">
                <AlertCircle size={14} /> AI Assistant is currently Offline for maintenance.
              </div>
            ) : messagesLeft <= 0 ? (
              <div className="text-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                Daily limit reached. Come back tomorrow! 😴
              </div>
            ) : (
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a quick doubt..."
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-1 w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 flex items-center justify-center text-white transition-colors"
                >
                  <Send size={16} className={loading ? "opacity-0" : "opacity-100"} />
                  {loading && <Loader2 size={16} className="absolute animate-spin" />}
                </button>
              </form>
            )}
            <div className="text-center mt-2">
              <span className="text-[9px] text-gray-600 font-light tracking-wider">AI MAY BE INACCURATE • CONCISE MODE ACTIVE</span>
            </div>
          </div>
          
        </div>
      )}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}
