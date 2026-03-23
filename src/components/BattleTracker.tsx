import { useState } from 'react';
import { 
  Activity, 
  Shield, 
  Swords, 
  Brain, 
  Copy, 
  X,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import './BattleTracker.css';

export interface OpponentPokemon {
  name: string;
  item?: string;
  ability?: string;
  moves: string[];
  status?: string;
  health?: number;
  evDeductions?: string;
}

interface BattleTrackerProps {
  opponentTeam: OpponentPokemon[];
  onLogSubmit: (log: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export function BattleTracker({ opponentTeam, onLogSubmit, isLoading, error }: BattleTrackerProps) {
  const [logInput, setLogInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyTeam = () => {
    const text = opponentTeam.map(p => 
      `${p.name} @ ${p.item || '???'}\nAbility: ${p.ability || '???'}\n- ${p.moves.join('\n- ')}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`battle-tracker-sidebar glass-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="tracker-toggle" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        <div className="live-status">
          <div className="pulse-dot"></div>
          <span>LIVE TRACKER</span>
        </div>
      </div>

      <div className="tracker-content">
        <div className="tracker-header">
           <h3><Activity size={18} className="icon-purple" /> Battle Dashboard</h3>
           {opponentTeam.length > 0 && (
             <button onClick={handleCopyTeam} className="icon-btn" title="Copy Team">
               <Copy size={16} />
             </button>
           )}
        </div>

        <div className="log-input-section">
          <div className="textarea-wrapper">
            <textarea 
              placeholder="Paste Showdown battle log..."
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              className="log-textarea"
            />
            {logInput && !isLoading && (
              <button className="clear-btn" onClick={() => setLogInput('')}>
                <X size={14} />
              </button>
            )}
          </div>
          
          {error && (
            <div className="battle-error">
              <Zap size={14} /> {error}
            </div>
          )}
          
          <button 
            onClick={() => onLogSubmit(logInput)} 
            disabled={isLoading || !logInput}
            className="sync-btn"
          >
            {isLoading ? (
              <><div className="spinner"></div> Analyzing...</>
            ) : (
              <><Zap size={16} /> Sync Battle State</>
            )}
          </button>
        </div>

        <div className="opponent-team-list">
          {opponentTeam.length === 0 ? (
            <div className="empty-tracker">
              <div className="empty-icon">🛡️</div>
              <p>No opponent data yet.</p>
              <span>Paste log after Turn 1.</span>
            </div>
          ) : (
            opponentTeam.map((mon, i) => (
              <div key={i} className="opponent-card">
                <div className="mon-header">
                  <div className="sprite-container">
                    <img 
                      src={`https://play.pokemonshowdown.com/sprites/ani/${mon.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`} 
                      alt={mon.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://play.pokemonshowdown.com/sprites/gen5/${mon.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
                      }}
                    />
                  </div>
                  <div className="mon-info">
                    <div className="mon-name">{mon.name}</div>
                    <div className="mon-item">
                      <Shield size={12} /> {mon.item || 'Unknown Item'}
                    </div>
                  </div>
                </div>
                
                <div className="mon-details">
                   <div className="ability-row">
                     <Zap size={12} className="icon-yellow" /> {mon.ability || 'Unknown Ability'}
                   </div>
                  
                  <div className="moves-grid">
                    {mon.moves.map((m, j) => (
                      <div key={j} className="move-pill">
                        <Swords size={10} /> {m}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - mon.moves.length) }).map((_, j) => (
                      <div key={`empty-${j}`} className="move-pill empty">?</div>
                    ))}
                  </div>

                  {mon.evDeductions && (
                    <div className="deduction-box">
                      <Brain size={14} className="icon-pink" />
                      <p>{mon.evDeductions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
