import { useState } from 'react';
import type { ExtractedTeam, ParsedPokemon } from '../types/smogon';
import { generateShowdownText } from '../services/exportUtils';
import { Copy, Check } from 'lucide-react';
import './TeamCard.css';

interface Props {
  team: ExtractedTeam;
  rank: number;
  onSelectPokemon: (name: string) => void;
  allPokemon: ParsedPokemon[];
  showIndex?: boolean;
}

export function TeamCard({ team, rank, onSelectPokemon, allPokemon, showIndex = true }: Props) {
  const [copied, setCopied] = useState(false);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateShowdownText(team.members, allPokemon);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="team-card glass-panel">
      <div className="team-header">
        <div className="team-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showIndex && <div className="team-rank-badge">#{rank}</div>}
          <h3 className="team-title" style={{ margin: 0 }}>Standard Set {rank}</h3>
        </div>
        <button className="export-btn" onClick={handleExport}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Export'}
        </button>
      </div>
      <div className="team-members">
        {team.members.map((member, i) => (
          <div key={`${member}-${i}`} className="member-badge clickable" onClick={() => onSelectPokemon(member)}>
             <span className="member-name">{member}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
