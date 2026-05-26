import { useState } from 'react';
import type { MatchupEntry, ParsedPokemon } from '../types/smogon';
import { MatchupBreakdown } from './MatchupBreakdown';

interface Props {
  matchupsData: Record<string, MatchupEntry[]>;
  allPokemon?: ParsedPokemon[];
}

export function MatchupHeatmap({ matchupsData, allPokemon }: Props) {
  const types = Object.keys(matchupsData).sort();
  const [selectedType, setSelectedType] = useState<string>(types[0] || '');
  const [openOpp, setOpenOpp] = useState<MatchupEntry | null>(null);
  const [bulkyDefenders, setBulkyDefenders] = useState(false);

  if (!types.length) return <div className="glass-panel" style={{padding: '24px'}}>No matchup data available.</div>;

  const currentMatchups = matchupsData[selectedType] || [];

  // Sort matchups highest win pct to lowest
  const sortedMatchups = [...currentMatchups].sort((a, b) => b.winPct - a.winPct);

  const selectType = (t: string) => {
    setSelectedType(t);
    setOpenOpp(null);
  };

  return (
    <div className="matchup-heatmap glass-panel">
      <div className="section-header">
        <h2>{selectedType} Matchup Spread</h2>
        <p className="section-desc">Win rate vs other monotypes — <strong>click any matchup</strong> to see which mons cause it</p>
      </div>

      <div className="type-selector">
        {types.map(t => (
           <button
             key={t}
             className={`type-btn ${selectedType === t ? 'active' : ''}`}
             onClick={() => selectType(t)}
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
          const isOpen = openOpp?.opponentType === m.opponentType;

          return (
            <button
              key={m.opponentType}
              className={`matchup-cell glass-panel interactive ${colorClass} ${isOpen ? 'selected' : ''}`}
              onClick={() => setOpenOpp(isOpen ? null : m)}
            >
              <span className="matchup-opp">vs {m.opponentType}</span>
              <span className="matchup-score">{m.winPct.toFixed(1)}%</span>
            </button>
          );
        })}
      </div>

      {openOpp && (
        allPokemon?.length ? (
          <MatchupBreakdown
            yourType={selectedType}
            oppType={openOpp.opponentType}
            winPct={openOpp.winPct}
            allPokemon={allPokemon}
            bulkyDefenders={bulkyDefenders}
            onToggleBulky={() => setBulkyDefenders((v) => !v)}
          />
        ) : (
          <div className="matchup-breakdown"><p className="text-muted">Roster data unavailable for breakdown.</p></div>
        )
      )}
    </div>
  );
}
