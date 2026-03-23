import { useState } from 'react';
import { parseShowdownTeam } from '../utils/showdownParser';
import type { UserPokemon } from '../utils/showdownParser';
import './TeamUploader.css';

interface TeamUploaderProps {
  onTeamLoaded: (team: UserPokemon[]) => void;
}

export function TeamUploader({ onTeamLoaded }: TeamUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [activeTeam, setActiveTeam] = useState<UserPokemon[] | null>(null);

  const handleImport = () => {
    const parsed = parseShowdownTeam(text);
    if (parsed.length > 0) {
      setActiveTeam(parsed);
      onTeamLoaded(parsed);
      setIsOpen(false);
      setText('');
    } else {
      alert("Could not parse any valid Showdown formats. Did you paste correctly?");
    }
  };

  const handleClear = () => {
    setActiveTeam(null);
    onTeamLoaded([]);
  };

  return (
    <div className="team-uploader-container">
      {activeTeam && activeTeam.length > 0 ? (
        <div className="active-team-preview glass-panel">
          <div className="team-preview-header">
            <h4>My Loaded Team</h4>
            <button onClick={handleClear} className="clear-team-btn" title="Clear Team">✕</button>
          </div>
          <div className="preview-sprites">
            {activeTeam.map((p, i) => (
              <img 
                key={i} 
                src={`https://play.pokemonshowdown.com/sprites/gen5/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`} 
                alt={p.name}
                title={`${p.name} @ ${p.item}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <button className="open-uploader-btn glass-panel" onClick={() => setIsOpen(true)}>
          <span className="icon">📥</span> 
          <span>Import Custom Team</span>
        </button>
      )}

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="uploader-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="uploader-header">
              <h3>Import Showdown Team</h3>
              <button onClick={() => setIsOpen(false)} className="close-btn">✕</button>
            </div>
            
            <textarea 
              placeholder="Paste your standard Showdown export here...&#10;&#10;Dragapult @ Choice Specs&#10;Ability: Infiltrator&#10;EVs: 252 SpA / 4 SpD / 252 Spe&#10;Timid Nature&#10;- Draco Meteor&#10;- Shadow Ball"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="pokepaste-input"
            />
            
            <button onClick={handleImport} className="import-submit-btn">
              Load Team into AI Memory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
