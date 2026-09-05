"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time?: string;
};

const defaultQuickReplies = [
  { en: "Fever and cough for 2 days", hi: "2 दिन से बुखार और खांसी है" },
  { en: "BP 160/100 with headache", hi: "BP 160/100 और सिरदर्द है" },
  { en: "Sugar check fasting 140", hi: "फास्टिंग शुगर 140 आई है" },
  { en: "What are red flag symptoms?", hi: "इमरजेंसी रेड फ्लैग लक्षण क्या हैं?" },
];

export default function FloatingChatbot() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome-msg",
      role: "assistant",
      text: localize(
        "Hello! I am RoboDoctor AI Assistant. Ask me anything about your symptoms, BP, sugar, medicines, or health risks.",
        "नमस्ते! मैं RoboDoctor AI सहायक हूं। अपने लक्षण, बीपी, शुगर, दवाओं या स्वास्थ्य जोखिमों के बारे में कुछ भी पूछें।"
      ),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setUnread(false);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isTyping) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: queryText,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/ai-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          language,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        localize(
          "I am available to provide general health guidance. Please ask your question.",
          "मैं सामान्य स्वास्थ्य मार्गदर्शन देने के लिए उपलब्ध हूं। अपना प्रश्न पूछें।"
        );

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (!isOpen) setUnread(true);
    } catch {
      const fallbackMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: localize(
          "I am temporarily unable to connect. Please check your network and try again.",
          "कनेक्ट करने में अस्थायी समस्या है। कृपया फिर प्रयास करें।"
        ),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="mb-4 flex flex-col w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[82vh] rounded-3xl border border-cyan-500/30 bg-slate-950 text-white shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl border border-cyan-500/40">
                🤖
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white">
                  {localize("RoboDoctor AI Chat", "RoboDoctor AI चैट")}
                </h3>
                <p className="text-[11px] font-medium text-cyan-400">
                  🟢 {localize("AI Health Assistant", "एआई स्वास्थ्य सहायक")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title={localize("Close Chat", "चैट बंद करें")}
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 font-medium text-slate-950 rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                {m.time && (
                  <span className="mt-1 text-[10px] text-slate-400 px-1">
                    {m.time}
                  </span>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 w-fit">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
                <span className="ml-1">{localize("Analyzing...", "विश्लेषण हो रहा है...")}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Pills */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/50 flex gap-2 overflow-x-auto no-scrollbar">
            {defaultQuickReplies.map((qr) => (
              <button
                key={qr.en}
                type="button"
                onClick={() => handleSendMessage(localize(qr.en, qr.hi))}
                className="whitespace-nowrap rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition flex-shrink-0"
              >
                {localize(qr.en, qr.hi)}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={localize("Ask symptoms, BP, sugar...", "लक्षण या बीपी पूछें...")}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition"
            >
              🚀
            </button>
          </form>
        </div>
      )}

      {/* Persistent Floating Bottom-Right Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-lime-400 p-3.5 sm:px-5 sm:py-3.5 text-black font-extrabold shadow-2xl hover:scale-105 transition-all duration-300 active:scale-95"
      >
        <span className="text-2xl animate-pulse">🤖</span>
        <span className="hidden sm:inline text-sm font-black tracking-wide">
          {localize("AI Assistant", "एआई सहायक")}
        </span>

        {/* Pulse ring animation */}
        <span className="absolute -inset-1 rounded-full bg-cyan-400 opacity-30 group-hover:opacity-60 blur transition animate-pulse -z-10" />

        {/* Unread badge dot */}
        {unread && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-950 animate-bounce">
            !
          </span>
        )}
      </button>
    </div>
  );
}
