import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';

// UUID fallback for older browsers
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};
import { sendChatMessage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: generateId(), role: MessageRole.MODEL, text: 'Hello! I am your construction AI assistant. Ask me anything about materials, regulations, or cost optimization.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: generateId(), role: MessageRole.USER, text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Format history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await sendChatMessage(history, userMsg.text);
      
      const botMsg: ChatMessage = { id: generateId(), role: MessageRole.MODEL, text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error instanceof Error ? error.message : 'Unknown error');
      const errorMsg: ChatMessage = { id: generateId(), role: MessageRole.MODEL, text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 p-4 border-b border-slate-200">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" /> Project Assistant
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 overflow-hidden ${
              msg.role === MessageRole.USER 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              {/* Markdown Renderer */}
              <div className={`text-sm ${msg.role === MessageRole.USER ? 'text-white' : 'text-slate-800'}`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style Tables to look organized
                    table: ({...props}) => (
                      <div className="overflow-x-auto my-3 rounded-lg border border-slate-300">
                        <table className="w-full text-left border-collapse" {...props} />
                      </div>
                    ),
                    thead: ({...props}) => <thead className="bg-slate-200 text-slate-700" {...props} />,
                    th: ({...props}) => <th className="px-3 py-2 border-b border-r border-slate-300 text-xs font-bold uppercase tracking-wider last:border-r-0" {...props} />,
                    td: ({...props}) => <td className="px-3 py-2 border-b border-r border-slate-200 text-sm last:border-r-0" {...props} />,
                    // Style other elements
                    p: ({...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                    strong: ({...props}) => <strong className="font-bold" {...props} />,
                    ul: ({...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                    ol: ({...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                    h1: ({...props}) => <h1 className="text-lg font-bold mt-3 mb-2" {...props} />,
                    h2: ({...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                    h3: ({...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
              
              <p className={`text-[10px] mt-1 ${msg.role === MessageRole.USER ? 'text-blue-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your project..."
          className="flex-1 px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;