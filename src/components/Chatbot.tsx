import { useState } from 'react';
import { X, Send, Sparkles, HelpCircle } from 'lucide-react';
import './Chatbot.css';

type Message = {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<any>;
};

export function AICoach({ allPokemon, userTeam }: { allPokemon?: any[], userTeam?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const suggestions = [
    "Who should I lead with?",
    "My opponent has X, should I switch out?",
    "Can a +2 Dragapult OHKO Goodra-H?",
    "What is the standard set for Great Tusk?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
      const endpoint = `${apiBase}/api/chat`;
      const prunedMessages = newMessages.slice(-10);

      const contextPayload = allPokemon?.slice(0, 150).map(p => ({
        Pokemon: p.name,
        Item: p.topItems[0]?.name || 'None',
        Ability: p.topAbilities[0]?.name || 'Unknown',
        EVs: p.topSpreads[0]?.name || 'Hardy:0/0/0/0/0/0'
      })) || [];

      const userTeamPayload = userTeam?.map(p => ({
        Pokemon: p.name,
        Item: p.item,
        Ability: p.ability,
        EVs: p.evs,
        Moves: p.moves.join(', ')
      })) || [];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: prunedMessages, 
          pokemonContext: contextPayload,
          userTeamContext: userTeamPayload
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'API failed');
      }
      
      const data = await res.json();
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        toolInvocations: data.toolInvocations
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-coach-wrapper">
      <div className="coach-header-btn" onClick={() => setIsOpen(true)}>
        <div className="coach-avatar-circle">
          <img src="/src/assets/prof_oak.png" alt="Prof. Oak" />
          <div className="status-indicator"></div>
        </div>
        <div className="coach-title-group">
          <h2>Prof. Oak's Corner</h2>
          <p>AI Battle Coach & Advisor</p>
        </div>
      </div>

      {isOpen && (
        <div className="modal-overlay coach-modal" onClick={() => setIsOpen(false)}>
          <div className="chat-window-large glass-panel" onClick={e => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-title">
                <Sparkles size={18} className="icon-purple" />
                <span>Consulting Professor Oak...</span>
              </div>
              <button className="chat-close" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">
                  <div className="coach-intro">
                    <div className="oak-avatar-large">
                      <img src="/src/assets/prof_oak.png" alt="Professor Oak" />
                    </div>
                    <h4>Hello there! Welcome to the world of Pokémon!</h4>
                    <p>I'm Professor Oak, your AI Battle Coach.</p>
                    <p className="sub-text">Paste enemy logs and I'll help you with switch-outs and damage calculations!</p>
                  </div>
                  
                  <div className="suggestions-grid">
                    {suggestions.map((s, i) => (
                      <div key={i} className="suggestion-chip">
                        <HelpCircle size={14} /> {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {error && (
                <div className="chat-bubble-wrapper assistant">
                  <div className="chat-avatar coach oak">
                    <img src="/src/assets/prof_oak.png" alt="Oak" />
                  </div>
                  <div className="chat-bubble assistant error-bubble">{error}</div>
                </div>
              )}

              {messages.map(m => (
                <div key={m.id} className={`chat-bubble-wrapper ${m.role}`}>
                  {m.role === 'assistant' && (
                    <div className="chat-avatar coach oak">
                      <img src="/src/assets/prof_oak.png" alt="Oak" />
                    </div>
                  )}
                  
                  <div className={`chat-bubble ${m.role}`}>
                    {m.content}
                    
                    {m.toolInvocations && m.toolInvocations.length > 0 && (
                      <div className="tool-invocations">
                        <div className="tool-badge">
                          <span className="tool-success">✅ Math calculated!</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="chat-bubble-wrapper assistant">
                  <div className="chat-avatar coach oak">
                    <img src="/src/assets/prof_oak.png" alt="Oak" />
                  </div>
                  <div className="chat-bubble assistant typing">Thinking & Calculating...</div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="chat-form">
              <input
                className="chat-input"
                value={input}
                placeholder="Ask Oak for advice..."
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="chat-send" type="submit">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
