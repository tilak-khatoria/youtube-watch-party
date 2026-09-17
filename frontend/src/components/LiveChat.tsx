import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Send, Crown, ShieldCheck, User, Smile } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (message: string) => void;
}

const QUICK_EMOJIS = ['🔥', '🍿', '😂', '👏', '❤️', '🎉'];

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSendEmoji = (emoji: string) => {
    onSendMessage(emoji);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#131319]">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages || []).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#acaab1]">
            <Smile className="w-8 h-8 text-[#00d2fd] mb-2" />
            <p className="text-xs space-label font-bold text-[#f9f5fd]">NO MESSAGES YET</p>
            <p className="text-[11px] text-[#acaab1] mt-1 font-sans">
              Say hello or react with an emoji!
            </p>
          </div>
        ) : (
          (messages || []).map((msg) => {
            const isSelf = msg?.senderId === currentUserId;
            const isHost = msg?.role === 'Host';
            const isMod = msg?.role === 'Moderator';
            const senderName = msg?.username || 'Guest';

            return (
              <div
                key={msg?.id || Math.random().toString()}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {/* Header info */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-[#f9f5fd]">
                    {senderName}
                  </span>

                  {isHost && (
                    <span className="flex items-center gap-0.5 text-[9px] space-label font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Crown className="w-2.5 h-2.5 text-amber-400" /> Host
                    </span>
                  )}
                  {isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] space-label font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-[#00d2fd] border border-cyan-500/30">
                      <ShieldCheck className="w-2.5 h-2.5 text-[#00d2fd]" /> Mod
                    </span>
                  )}
                  {!isHost && !isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] space-label text-[#acaab1] px-1 py-0.2 rounded bg-[#25252d]">
                      <User className="w-2.5 h-2.5 text-[#acaab1]" /> Viewer
                    </span>
                  )}

                  <span className="text-[10px] text-[#76747b] font-mono">
                    {formatTime(msg?.timestamp || Date.now())}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs max-w-[85%] break-words shadow-md ${
                    isSelf
                      ? 'btn-kinetic text-black font-semibold rounded-tr-none'
                      : 'bg-[#19191f] text-[#f9f5fd] border border-white/10 rounded-tl-none'
                  }`}
                >
                  {msg?.message || ''}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-3.5 py-1.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto bg-[#19191f]">
        <span className="text-[10px] space-label font-bold text-[#00d2fd] shrink-0">
          REACT:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="hover:scale-125 transition-transform text-sm px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-white/10 bg-[#0e0e13] flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Send a chat message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs text-[#f9f5fd] placeholder-[#76747b] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn-kinetic p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4 text-black" />
        </button>
      </form>
    </div>
  );
};
