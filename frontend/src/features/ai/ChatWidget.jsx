import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, RotateCcw, MessageSquareText, Loader2, Compass } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import MarkdownContent from './MarkdownContent';
import api from '../../services/api';

const initialMessages = [
  {
    role: 'assistant',
    text: "Hi! 👋 I'm your **StudyBridge AI Admission Advisor**.\n\nI can analyze your academic profile against real university requirements, find scholarships, guide your SOP, and answer visa questions. How can I help you today?",
  },
];

const STARTER_TOPICS = [
  {
    icon: '🎯',
    title: 'Match Universities',
    desc: 'Find top universities matching my CGPA, IELTS, and subject',
    prompt: 'Match universities to my profile and test scores',
  },
  {
    icon: '💰',
    title: 'Find Scholarships',
    desc: 'Discover funded scholarships and grants for my preferred field',
    prompt: 'What are the best scholarships available for my profile in your database?',
  },
  {
    icon: '📝',
    title: 'SOP & Essay Guide',
    desc: 'Step-by-step tips to draft a standout Statement of Purpose',
    prompt: 'Give me a structured guide and tips to write an outstanding Statement of Purpose (SOP)',
  },
  {
    icon: '🌍',
    title: 'Compare Countries',
    desc: 'Compare tuition, living costs, and post-study work visas',
    prompt: 'Compare studying in the USA vs Germany vs Canada regarding tuition costs, living expenses, and work visas.',
  },
];

const ChatWidget = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const lastPromptIndexRef = useRef(null);

  // Smoothly scroll to target message or bottom
  const scrollToTarget = (index) => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;

    if (index !== null && index !== undefined) {
      const el = document.getElementById(`chat-msg-${index}`);
      if (el) {
        const targetTop = el.offsetTop - container.offsetTop - 12;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        return;
      }
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    if (loading) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    } else if (messages.length > 1) {
      const scrollIndex = lastPromptIndexRef.current !== null ? lastPromptIndexRef.current : messages.length - 1;
      setTimeout(() => scrollToTarget(scrollIndex), 60);
    }
  }, [messages, loading]);

  const handleSend = async (userQuery) => {
    const textToSend = (userQuery || message).trim();
    if (!textToSend || loading) return;

    const newPromptIndex = messages.length;
    lastPromptIndexRef.current = newPromptIndex;

    setMessages((current) => [...current, { role: 'user', text: textToSend }]);
    setMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: textToSend });
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      const errorText =
        err.response?.status === 401
          ? 'Please log in to chat with the AI Advisor.'
          : err.response?.data?.message || 'Something went wrong while processing your request. Please try again.';
      setMessages((current) => [...current, { role: 'assistant', text: errorText }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    setMessages(initialMessages);
    setMessage('');
    lastPromptIndexRef.current = null;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Card className="flex h-[calc(100vh-210px)] min-h-[440px] max-h-[740px] flex-col overflow-hidden border border-slate-200/90 bg-white p-0 shadow-md">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand sm:h-8 sm:w-8">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 sm:text-sm">Counseling Session</h3>
            <p className="text-[11px] text-slate-500">Live admission & scholarship advisor</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 sm:px-3 sm:py-1.5"
          title="Restart Conversation"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Message Stream */}
      <div ref={chatContainerRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5 scroll-smooth">
        {messages.map((entry, index) => {
          const isAssistant = entry.role === 'assistant';
          return (
            <div
              key={`${entry.role}-${index}`}
              id={`chat-msg-${index}`}
              className={`flex gap-2.5 sm:gap-3 ${isAssistant ? 'items-start' : 'items-end justify-end'}`}
            >
              {isAssistant && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xs sm:h-8 sm:w-8">
                  <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs sm:max-w-[85%] sm:px-4 sm:py-3 ${
                  isAssistant
                    ? 'border border-slate-100 bg-slate-50/80 text-slate-800'
                    : 'bg-brand text-white'
                }`}
              >
                <MarkdownContent content={entry.text} isUser={!isAssistant} />
              </div>

              {!isAssistant && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand sm:h-8 sm:w-8">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Starter Topic Cards when only the welcome message exists */}
        {messages.length === 1 && !loading && (
          <div className="mt-4 pl-0 sm:pl-10">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Compass className="h-3.5 w-3.5 text-brand" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Explore popular topics:
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STARTER_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-left shadow-2xs transition hover:border-brand/40 hover:bg-white hover:shadow-xs active:scale-[0.99]"
                >
                  <span className="text-xl transition group-hover:scale-110">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-brand sm:text-sm">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xs sm:h-8 sm:w-8">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-500 shadow-xs">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              <span>Analyzing recommendations & answering...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prominent, Always-Visible Input Form */}
      <form
        className="flex items-center gap-2.5 border-t border-slate-100 bg-white p-3 sm:px-4 sm:py-3.5 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Input
          ref={inputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask anything (e.g. universities matching my CGPA, scholarships, SOP advice, visas)..."
          disabled={loading}
          className="flex-1 text-xs sm:text-sm"
        />
        <Button type="submit" variant="primary" disabled={loading || !message.trim()} className="flex items-center gap-1.5 px-4 py-2 sm:px-5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default ChatWidget;
