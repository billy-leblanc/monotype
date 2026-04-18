import React, { useState } from 'react';
import type { ParsedPokemon } from '../types/smogon';
import { ChevronDown, ChevronUp, Crosshair, ShieldAlert, Activity } from 'lucide-react';
import './PokemonCard.css';

interface Props {
  data: ParsedPokemon;
  rank: number;
  compact?: boolean;
}

export const PokemonCard: React.FC<Props> = ({ data, rank, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  // Format utility
  const fmt = (num: number) => num.toFixed(1) + '%';

  return (
    <div className={`glass-panel pokemon-card ${compact ? 'compact-card' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-rank">#{rank}</div>
        <div className="card-main-info">
          <div className="pokemon-name-group">
            <h2 className="pokemon-name">{data.name}</h2>
            <span className="pokemon-types">{data.types.join(' / ')}</span>
          </div>
          {!compact && (
             <div className="usage-bar-container">
               <div className="usage-bar" style={{ width: `${Math.min(data.usagePct, 100)}%` }}></div>
             </div>
          )}
        </div>
        <div className="card-stats-quick">
          <span className="usage-text">{fmt(data.usagePct)} Usage</span>
          <button className="expand-btn">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-details">
          <div className="details-grid">
            {/* Most Used Sets & Items */}
            <div className="detail-section">
              <h3 className="section-title"><Activity size={16} /> Most Used Sets</h3>
              <div className="stats-list">
                {data.topMoves.slice(0, 4).map(m => (
                  <div key={m.name} className="stat-row">
                    <span>{m.name}</span>
                    <span className="stat-val">{fmt(m.pct)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h3 className="section-title">Items & Abilities</h3>
              <div className="stats-list">
                {data.topItems.slice(0, 2).map(i => (
                  <div key={i.name} className="stat-row">
                    <span>{i.name}</span>
                    <span className="stat-val">{fmt(i.pct)}</span>
                  </div>
                ))}
                <div className="divider"></div>
                {data.topAbilities.slice(0, 2).map(a => (
                  <div key={a.name} className="stat-row">
                    <span>{a.name}</span>
                    <span className="stat-val">{fmt(a.pct)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* EV Spreads */}
            <div className="detail-section">
              <h3 className="section-title"><Crosshair size={16} /> Standard Builds (EVs)</h3>
              <div className="stats-list">
                {data.topSpreads.slice(0, 3).map(s => {
                  const [nature, spread] = s.name.split(':');
                  return (
                    <div key={s.name} className="stat-spread">
                      <div className="spread-name">{nature} {spread}</div>
                      <div className="stat-val">{fmt(s.pct)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Counters / Strategy */}
            <div className="detail-section counters-section">
              <h3 className="section-title"><ShieldAlert size={16} className="text-pink" /> How to Counter</h3>
              <div className="stats-list">
                {data.counters.slice(0, 4).map(c => (
                  <div key={c.name} className="stat-counter">
                    <span className="counter-name">{c.name}</span>
                    <div className="counter-metrics">
                      <span className="metric-ko" title="KO Probability">KO: {(c.koPct * 100).toFixed(0)}%</span>
                      <span className="metric-switch" title="Switch Probability">SW: {(c.switchPct * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                {data.counters.length === 0 && <span className="text-muted">No specific counter data.</span>}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
