import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Send, Sparkles, Zap, ClipboardPaste } from 'lucide-react';
import { parseShowdownTeam } from '../utils/showdownParser';
import type { UserPokemon } from '../utils/showdownParser';
import './MatchAssistant.css';

export interface OpponentPokemon {
  name: string;
  item?: string;
  ability?: string;
  moves: string[];
  status?: string;
  health?: number;
  evDeductions?: string;
}

type Message = {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<any>;
};

interface MatchAssistantProps {
  allPokemon?: any[];
  userTeam: UserPokemon[];
  onTeamLoaded: (team: UserPokemon[]) => void;
  opponentTeam: OpponentPokemon[];
  onLogSubmit: (log: string) => void;
  isLogSyncing: boolean;
  logError?: string | null;
}

export function MatchAssistant({
  allPokemon,
  userTeam,
  onTeamLoaded,
  opponentTeam,
  onLogSubmit,
  isLogSyncing,
  logError
}: MatchAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Importer state
  const [teamInput, setTeamInput] = useState('');
  
  // Tracker state
  const [logInput, setLogInput] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', content: 'Load your team and the live battle log, then ask me anything!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Handlers
  const handleImportTeam = () => {
    const parsed = parseShowdownTeam(teamInput);
    if (parsed.length > 0) {
      onTeamLoaded(parsed);
      setTeamInput('');
    } else {
      alert("Could not parse team. Make sure it's valid Showdown format!");
    }
  };

  const handleClearTeam = () => onTeamLoaded([]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: chatInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);
    setChatError(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
      const endpoint = `${apiBase}/api/chat`;

      const contextPayload = allPokemon?.slice(0, 150).map(p => ({
        Pokemon: p.name,
        Item: p.topItems[0]?.name || 'None',
        Ability: p.topAbilities[0]?.name || 'Unknown',
        EVs: p.topSpreads[0]?.name || 'Hardy:0/0/0/0/0/0'
      })) || [];

      const userTeamPayload = userTeam.map(p => ({
        Pokemon: p.name,
        Item: p.item,
        Ability: p.ability,
        Moves: p.moves.join(', ')
      }));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.slice(-8), 
          pokemonContext: contextPayload,
          userTeamContext: userTeamPayload,
          opponentContext: opponentTeam
        })
      });
      
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        toolInvocations: data.toolInvocations
      }]);
    } catch (err: any) {
      setChatError("Failed to connect to Professor Oak.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className={`match-assistant glass-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="assistant-toggle" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        <div className="vertical-text">
          <Sparkles size={14} className="icon-cyan" />
          <span>AI ASSISTANT</span>
        </div>
      </div>

      <div className="assistant-content">
        <div className="assistant-header">
          <img src="/src/assets/prof_oak.png" alt="Oak" className="oak-avatar" />
          <div className="header-text">
            <h3>Live Match Assistant</h3>
            <p>Prof. Oak's Strategy Corner</p>
          </div>
        </div>

        <div className="assistant-scroller">
          {/* STEP 1: USER TEAM */}
          <div className="assistant-section">
            <h4 className="section-label">1. Your Team</h4>
            {userTeam.length > 0 ? (
              <div className="team-preview-box interactive">
                <button className="clear-chip-btn" onClick={handleClearTeam}><X size={12}/></button>
                <div className="mini-sprites">
                  {userTeam.map((p, i) => (
                    <img key={i} src={`https://play.pokemonshowdown.com/sprites/gen5/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`} alt={p.name} title={p.name} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="importer-box">
                <textarea 
                  placeholder="Paste Showdown format team..." 
                  value={teamInput}
                  onChange={e => setTeamInput(e.target.value)}
                  className="small-textarea"
                />
                {teamInput && <button className="brand-btn" onClick={handleImportTeam}>Load Team</button>}
              </div>
            )}
          </div>

          {/* STEP 2: OPPONENT LOG */}
          <div className="assistant-section">
            <h4 className="section-label">2. Opponent State</h4>
            <div className="importer-box">
               <div className="textarea-with-icon">
                 <ClipboardPaste size={14} className="input-icon" />
                 <textarea 
                   placeholder="Paste Battle Turn Log..." 
                   value={logInput}
                   onChange={e => setLogInput(e.target.value)}
                   className="small-textarea"
                 />
                 {logInput && <button className="clear-input-btn" onClick={() => setLogInput('')}><X size={12}/></button>}
               </div>
               
               {logError && <div className="error-chip"><Zap size={10}/> {logError}</div>}
               <button 
                 className="brand-btn outline-btn" 
                 disabled={isLogSyncing || !logInput}
                 onClick={() => onLogSubmit(logInput)}
               >
                 {isLogSyncing ? 'Syncing...' : 'Sync Turn'}
               </button>
            </div>

            {opponentTeam.length > 0 && (
              <div className="opponent-compact-list">
                {opponentTeam.map((mon, i) => (
                  <div key={i} className="mini-opp-card">
                    <img src={`https://play.pokemonshowdown.com/sprites/gen5/${mon.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`} alt={mon.name} className="mini-opp-sprite" />
                    <div className="mini-opp-info">
                      <span className="mon-name">{mon.name}</span>
                      <div className="mini-moves">
                        {mon.moves.map(m => <span key={m} className="mini-move">{m}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: AI CHAT */}
          <div className="assistant-section chat-section">
            <h4 className="section-label">3. Strategy Chat</h4>
            <div className="chat-log">
               {messages.map(m => (
                 <div key={m.id} className={`msg-bubble ${m.role}`}>
                   {m.content}
                 </div>
               ))}
               {isChatLoading && <div className="msg-bubble assistant typing">Oak is typing...</div>}
               {chatError && <div className="msg-bubble error">{chatError}</div>}
            </div>
            
            <form onSubmit={handleChatSubmit} className="chat-input-bar">
               <input 
                 value={chatInput}
                 onChange={e => setChatInput(e.target.value)}
                 placeholder="Type your question..."
                 className="chat-field"
               />
               <button type="submit" className="chat-send-btn"><Send size={16}/></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
