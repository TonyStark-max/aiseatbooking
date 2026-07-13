import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle, Sparkles, Zap } from 'lucide-react';
import { api } from '../lib/api';
import type { Seat } from '../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  proposal?: {
    eventId: number;
    eventName: string;
    seatIds: number[];
    seatLabels: string[];
    price: number;
  };
}

interface AiChatProps {
  onAcceptProposal: (eventId: number, seatIds: number[]) => void;
  onHoldSuccess: (eventId: number, holdId: string, seatIds: number[], expiresAt: number) => void;
  availableSeats: Seat[];
  currentEventId: number | null;
  userId: string;
}

export const AiChat: React.FC<AiChatProps> = ({
  onAcceptProposal,
  onHoldSuccess,
  availableSeats,
  currentEventId,
  userId,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hey there! 👋 I'm your AI booking assistant. I can book tickets for any movie instantly — just tell me what you want in plain English.\n\nTry something like:\n• \"Book seats A1 and A2 for Interstellar\"\n• \"Hold 2 seats for Dune\"\n• \"Find me seats for Oppenheimer\"\n• \"What movies are available?\""
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await api.aiChat(userText, currentEventId, userId);
      const aiMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: response.text,
        proposal: response.proposal,
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      if (response.action === 'HOLD_SUCCESS' && response.holdDetails) {
        onHoldSuccess(
          response.holdDetails.eventId,
          response.holdDetails.holdId,
          response.holdDetails.seatIds,
          response.holdDetails.expiresAt
        );
      }
    } catch (err) {
      console.warn("Backend AI chat error, running local fallback parser:", err);
      setTimeout(() => {
        let aiText = "I couldn't reach the booking server right now. Make sure the backend is running, then try again!";
        let proposal;

        const normalized = userText.toLowerCase();
        if (normalized.includes('kalki')) {
          aiText = "🦾 Found 'Kalki 2898 AD'! Here are 2 seats:";
          proposal = {
            eventId: 1,
            eventName: "Kalki 2898 AD (Epic Sci-Fi)",
            seatIds: [1, 2],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('devara')) {
          aiText = "🌊 Here are 2 seats for 'Devara: Part 1':";
          proposal = {
            eventId: 2,
            eventName: "Devara: Part 1",
            seatIds: [41, 42],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('pushpa')) {
          aiText = "🔥 Locked in 2 seats for 'Pushpa 2: The Rule':";
          proposal = {
            eventId: 3,
            eventName: "Pushpa 2: The Rule",
            seatIds: [81, 82],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('salaar')) {
          aiText = "⚔️ Got 2 seats for 'Salaar: Part 1 - Ceasefire':";
          proposal = {
            eventId: 4,
            eventName: "Salaar: Part 1 - Ceasefire",
            seatIds: [121, 122],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('deadpool') || normalized.includes('wolverine')) {
          aiText = "⚔️ Here are 2 seats for 'Deadpool & Wolverine':";
          proposal = {
            eventId: 5,
            eventName: "Deadpool & Wolverine (Marvel)",
            seatIds: [161, 162],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('inside out')) {
          aiText = "🧠 Found 2 seats for 'Inside Out 2':";
          proposal = {
            eventId: 6,
            eventName: "Inside Out 2 (Pixar Animation)",
            seatIds: [201, 202],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('furiosa') || normalized.includes('mad max')) {
          aiText = "🏍️ Here are 2 seats for 'Furiosa: A Mad Max Saga':";
          proposal = {
            eventId: 7,
            eventName: "Furiosa: A Mad Max Saga",
            seatIds: [241, 242],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('dune')) {
          aiText = "🏜️ Got 2 seats for 'Dune: Part Two':";
          proposal = {
            eventId: 8,
            eventName: "Dune: Part Two (Director's Cut)",
            seatIds: [281, 282],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('oppenheimer')) {
          aiText = "💥 Found 2 seats for 'Oppenheimer':";
          proposal = {
            eventId: 9,
            eventName: "Oppenheimer (70mm Experience)",
            seatIds: [321, 322],
            seatLabels: ["A1", "A2"],
            price: 50.0
          };
        } else if (normalized.includes('movie') || normalized.includes('available') || normalized.includes('show') || normalized.includes('list') || normalized.includes('what')) {
          aiText = "🎬 Here are all the movies currently available:\n\n• Kalki 2898 AD\n• Devara: Part 1\n• Pushpa 2: The Rule\n• Salaar: Part 1 - Ceasefire\n• Deadpool & Wolverine\n• Inside Out 2\n• Furiosa: A Mad Max Saga\n• Dune: Part Two\n• Oppenheimer\n\nJust tell me which one you'd like to book!";
        } else if (normalized.includes('aisle') || normalized.includes('seats') || normalized.includes('suggest')) {
          if (currentEventId && availableSeats.length >= 2) {
            const selected = availableSeats.filter(s => s.status === 'AVAILABLE').slice(0, 2);
            if (selected.length === 2) {
              aiText = "✅ Based on availability, I recommend seats " + selected.map(s => s.seatLabel).join(' & ') + ":";
              proposal = {
                eventId: currentEventId,
                eventName: "Selected Event",
                seatIds: selected.map(s => s.id),
                seatLabels: selected.map(s => s.seatLabel),
                price: 50.0
              };
            } else {
              aiText = "😔 Not enough available seats to make a suggestion right now.";
            }
          } else {
            aiText = "Please select a movie first from the right panel, then ask me to suggest seats!";
          }
        }

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiText,
          proposal,
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleQuickAction = (text: string) => {
    setInputValue(text);
  };

  return (
    <aside className="ai-sidebar">
      <div className="ai-sidebar-header">
        <div className="ai-sidebar-title">
          <div className="ai-icon-pulse">
            <Sparkles size={16} />
          </div>
          <span>AI Ticket Booking</span>
        </div>
        <p className="ai-sidebar-subtitle">
          Natural language ↔ Pessimistic DB locks. Ask me to book any movie.
        </p>
      </div>

      <div className="ai-sidebar-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.sender}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="chat-sender-label">
                {msg.sender === 'ai' ? '✦ AI AGENT' : 'YOU'}
              </span>
              <div className="ai-message-text" style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
              
              {msg.proposal && (
                <div className="ai-proposal-card">
                  <div className="ai-proposal-header">
                    <Zap size={12} />
                    <span>BOOKING PROPOSAL</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-ink)' }}>
                    {msg.proposal.eventName}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                    <span>Seats: {msg.proposal.seatLabels.join(', ')}</span>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>${(msg.proposal.price * msg.proposal.seatIds.length).toFixed(2)}</span>
                  </div>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '10px 12px', fontSize: '12px', width: '100%', marginTop: '6px' }}
                    onClick={() => onAcceptProposal(msg.proposal!.eventId, msg.proposal!.seatIds)}
                  >
                    <CheckCircle size={14} />
                    <span>Accept & Hold Seats</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="chat-message ai">
            <div className="ai-typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <span>Searching seats…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="ai-quick-actions">
          <span className="ai-quick-label">Quick actions</span>
          <div className="ai-quick-buttons">
            <button 
              className="ai-quick-btn"
              onClick={() => handleQuickAction("Book seats A1 and A2 for Kalki")}
            >
              🦾 Book Kalki
            </button>
            <button 
              className="ai-quick-btn"
              onClick={() => handleQuickAction("Hold 2 seats for Devara")}
            >
              🌊 Hold Devara seats
            </button>
            <button 
              className="ai-quick-btn"
              onClick={() => handleQuickAction("What movies are available?")}
            >
              🎬 List all movies
            </button>
            <button 
              className="ai-quick-btn"
              onClick={() => handleQuickAction("Book A3, A4 for Pushpa 2")}
            >
              🔥 Book Pushpa 2
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="ai-sidebar-input-area">
        <input
          type="text"
          className="ai-sidebar-input"
          placeholder="Tell me what to book…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isTyping}
        />
        <button type="submit" className="ai-sidebar-send" disabled={isTyping} aria-label="Send message to AI assistant" title="Send message to AI assistant">
          <Send size={14} />
        </button>
      </form>
    </aside>
  );
};
