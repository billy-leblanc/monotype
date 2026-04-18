import { useState } from 'react';
import type { TopLead } from '../types/smogon';

interface Props {
  leadsData: Record<string, TopLead[]>;
}

export function LeadAnalysis({ leadsData }: Props) {
  const types = Object.keys(leadsData).sort();
  const [selectedType, setSelectedType] = useState<string>(types[0] || '');

  if (!types.length) return <div className="glass-panel" style={{padding: '24px'}}>No lead data available.</div>;

  const leads = leadsData[selectedType] || [];

  return (
    <div className="lead-analysis glass-panel">
      <div className="section-header">
        <h2>Strategic Leads: {selectedType}</h2>
        <p className="section-desc">The most common optimal leads for mono-{selectedType.toLowerCase()} teams</p>
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

      <div className="lead-cards">
        {leads.map((lead, idx) => (
          <div key={lead.pokemon} className="lead-card glass-panel interactive">
            <div className="lead-rank">#{idx + 1}</div>
            <img 
              src={`https://play.pokemonshowdown.com/sprites/gen5/${lead.pokemon.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`} 
              alt={lead.pokemon} 
              className="lead-sprite"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://play.pokemonshowdown.com/sprites/icons/0.png';
              }}
            />
            <div className="lead-info">
              <h3>{lead.pokemon}</h3>
              <div className="lead-stats">
                <span className="stat-label">Lead Frequency:</span>
                <span className="stat-value highlight">{lead.usagePct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
