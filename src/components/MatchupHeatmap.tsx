import { useState } from 'react';
import type { MatchupEntry } from '../types/smogon';

interface Props {
  matchupsData: Record<string, MatchupEntry[]>;
}

export function MatchupHeatmap({ matchupsData }: Props) {
  const types = Object.keys(matchupsData).sort();
  const [selectedType, setSelectedType] = useState<string>(types[0] || '');

  if (!types.length) return <div className="glass-panel" style={{padding: '24px'}}>No matchup data available.</div>;

  const currentMatchups = matchupsData[selectedType] || [];
  
  // Sort matchups highest win pct to lowest
  const sortedMatchups = [...currentMatchups].sort((a, b) => b.winPct - a.winPct);

  return (
    <div className="matchup-heatmap glass-panel">
      <div className="section-header">
        <h2>{selectedType} Matchup Spread</h2>
        <p className="section-desc">Win rate percentages against other monotype compositions</p>
      </div>

      <div className="type-selector">
        {types.map(t => (
           <button 
             key={t}
             className={`type-btn ${selectedType === t ? 'active' : ''}`}
             onClick={() => setSelectedType(t)}
           >
             {t}
           </button>
        ))}
      </div>

      <div className="matchup-grid">
        {sortedMatchups.map(m => {
          const isFavorable = m.winPct > 50;
          const isNeutral = m.winPct === 50;
          const colorClass = isFavorable ? 'favorable' : isNeutral ? 'neutral' : 'unfavorable';

          return (
            <div key={m.opponentType} className={`matchup-cell glass-panel interactive ${colorClass}`}>
              <span className="matchup-opp">vs {m.opponentType}</span>
              <span className="matchup-score">{m.winPct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
