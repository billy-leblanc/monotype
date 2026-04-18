import { useEffect, useState } from 'react';
import { fetchStats } from './services/statsFetcher';
import type { MonotypeData } from './types/smogon';
import { PokemonCard } from './components/PokemonCard';
import { TeamCard } from './components/TeamCard';
import { AICoach } from './components/Chatbot';
import { TeamUploader } from './components/TeamUploader';
import { BattleTracker } from './components/BattleTracker';
import { LeadAnalysis } from './components/LeadAnalysis';
import { MatchupHeatmap } from './components/MatchupHeatmap';
import type { OpponentPokemon } from './components/BattleTracker';
import type { UserPokemon } from './utils/showdownParser';
import { Search, Loader2, BarChart3, Users, Swords, X, ChevronDown, ChevronUp, FastForward, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './App.css';

function App() {
  const [data, setData] = useState<MonotypeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userTeam, setUserTeam] = useState<UserPokemon[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<OpponentPokemon[]>([]);
  const [isAnalyzingLog, setIsAnalyzingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pokemon' | 'teams' | 'types' | 'leads' | 'matchups'>('pokemon');
  const [selectedMon, setSelectedMon] = useState<string | null>(null);
  const [openType, setOpenType] = useState<string | null>(null);
  const [elo, setElo] = useState<'1500' | '1630' | '1760'>('1760');
  const [compactMode, setCompactMode] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const stats = await fetchStats(elo);
        if (active) setData(stats);
      } catch (err) {
        if (active) setError("Failed to load compiled local metadata. Try running node scripts/compile-stats.js.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [elo]);

  const filteredData = data?.pokemon?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];
  const selectedPokemonData = data?.pokemon?.find(p => p.name === selectedMon);
  
  const handleAnalyzeLog = async (log: string) => {
    setLogError(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
      const endpoint = `${apiBase}/api/chat`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: `BATTLE_LOG_SYNC: ${log}` }],
          pokemonContext: [], // In search mode we don't need full context
          userTeamContext: userTeam
        })
      });
      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Log sync failed');
      }
      const data = await res.json();
      if (data.battleState) {
        setOpponentTeam(data.battleState);
      }
    } catch (err: any) {
      console.error("Log sync failed:", err);
      setLogError(err.message || "Failed to analyze battle log.");
    } finally {
      setIsAnalyzingLog(false);
    }
  };

  return (
    <div className="app-container">
      <BattleTracker 
        opponentTeam={opponentTeam} 
        onLogSubmit={handleAnalyzeLog} 
        isLoading={isAnalyzingLog}
        error={logError}
      />
      {selectedMon && selectedPokemonData && (
        <div className="modal-overlay" onClick={() => setSelectedMon(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedPokemonData.name} - Optimal Core Set</h3>
              <button className="close-btn" onClick={() => setSelectedMon(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="set-details">
              <div className="set-row">
                <span className="set-label">Item:</span>
                <span className="set-value">{selectedPokemonData.topItems[0]?.name || 'None'}</span>
              </div>
              <div className="set-row">
                <span className="set-label">Ability:</span>
                <span className="set-value">{selectedPokemonData.topAbilities[0]?.name || 'None'}</span>
              </div>
              <div className="set-row">
                <span className="set-label">Nature/EVs:</span>
                <span className="set-value">{selectedPokemonData.topSpreads[0]?.name || 'Unknown'}</span>
              </div>
              <div className="set-row">
                <span className="set-label">Moves:</span>
                <span className="set-value">{selectedPokemonData.topMoves.slice(0, 4).map(m => m.name).join(' / ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
        <header className="app-header">
          <div className="header-top">
            <div className="header-identity">
              <AICoach allPokemon={data?.pokemon} userTeam={userTeam} />
              <div className="header-action-area">
                <TeamUploader onTeamLoaded={setUserTeam} />
                <button 
                  className="collapse-header-btn" 
                  onClick={() => setHeaderCollapsed(!headerCollapsed)}
                  title={headerCollapsed ? "Show Workflow" : "Hide Workflow"}
                >
                  {headerCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </div>
            </div>
          </div>

          {!headerCollapsed && (
            <div className="battle-workflow glass-panel centered-workflow">
              <div className="workflow-step">
                <div className="step-num">1</div>
                <div className="step-txt">
                  <strong>Import Your Team</strong>
                  <p>Paste your Showdown export to start.</p>
                </div>
              </div>
              <div className="workflow-divider">→</div>
              <div className="workflow-step">
                <div className="step-num">2</div>
                <div className="step-txt">
                  <strong>Track the Match</strong>
                  <p>Paste battle logs into the Live Tracker.</p>
                </div>
              </div>
              <div className="workflow-divider">→</div>
              <div className="workflow-step">
                <div className="step-num">3</div>
                <div className="step-txt">
                  <strong>Win with the Coach</strong>
                  <p>Ask Prof. Oak for switch-outs and calcs.</p>
                </div>
              </div>
            </div>
          )}
        </header>

      <main className="app-main">
        <div className="elo-selection-bar" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="elo-tabs glass-panel">
            <button className={`elo-btn ${elo === '1500' ? 'active' : ''}`} onClick={() => setElo('1500')}>1500 MMR</button>
            <button className={`elo-btn ${elo === '1630' ? 'active' : ''}`} onClick={() => setElo('1630')}>1630 MMR</button>
            <button className={`elo-btn ${elo === '1760' ? 'active' : ''}`} onClick={() => setElo('1760')}>1760 MMR</button>
          </div>
        </div>
        <div className="tab-navigation glass-panel">
          <button 
            className={`tab-btn ${activeTab === 'pokemon' ? 'active' : ''}`}
            onClick={() => setActiveTab('pokemon')}
          >
            <Swords size={18} /> Rankings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Users size={18} /> Metagame Cores
          </button>
          <button 
            className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`}
            onClick={() => setActiveTab('types')}
          >
            <BarChart3 size={18} /> Popular Types
          </button>
          <button 
            className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            <FastForward size={18} /> Top Leads
          </button>
          <button 
            className={`tab-btn ${activeTab === 'matchups' ? 'active' : ''}`}
            onClick={() => setActiveTab('matchups')}
          >
            <Activity size={18} /> Matchups
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={48} />
            <p>Compiling Latest Metadata...</p>
          </div>
        ) : error || !data || !data.pokemon ? (
          <div className="error-state glass-panel">
            <p>{error || "No data available."}</p>
          </div>
        ) : (
          <div className="results-container">
            
            {activeTab === 'leads' && data.leads && (
              <LeadAnalysis leadsData={data.leads} />
            )}

            {activeTab === 'matchups' && data.matchups && (
              <MatchupHeatmap matchupsData={data.matchups} />
            )}

            {activeTab === 'teams' && data.teams && (
              <div className="teams-view">
                <div className="section-header">
                  <h2>Monotype Standard Cores</h2>
                  <p className="section-desc">Select a Type to view its Top Standard Teams.</p>
                </div>
                <div className="accordion-list">
                  {Object.entries(data.teams)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([type, typeTeams]) => (
                    <div key={type} className="accordion-item glass-panel">
                      <button 
                        className={`accordion-header ${openType === type ? 'active' : ''}`}
                        onClick={() => setOpenType(openType === type ? null : type)}
                      >
                        <span className="accordion-type">{type}</span>
                        <div className="accordion-right">
                          <span className="accordion-count">{typeTeams.length} Sets</span>
                          {openType === type ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>
                      
                      {openType === type && (
                        <div className="accordion-content">
                          {typeTeams.map((team, index) => (
                            <TeamCard 
                              key={team.id} 
                              team={team} 
                              rank={index + 1} 
                              onSelectPokemon={setSelectedMon} 
                              allPokemon={data.pokemon}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'types' && data.typeUsage && (
              <div className="types-view glass-panel">
                 <div className="section-header">
                  <h2>Most Played Types</h2>
                  <p className="section-desc">Total cumulative play volume by Monotype</p>
                </div>
                <div className="chart-container" style={{ width: '100%', height: 500, marginTop: '24px' }}>
                  <ResponsiveContainer>
                    <BarChart data={data.typeUsage} layout="vertical" margin={{ top: 5, right: 60, left: 80, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="type" 
                        type="category" 
                        stroke="#a5b4fc" 
                        width={100} 
                        tick={{ fill: '#fff', fontSize: 13, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 10, 18, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: '#a5b4fc', fontWeight: 600 }}
                        cursor={{fill: 'rgba(255,255,255,0.03)'}}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[0, 4, 4, 0]} 
                        label={{ position: 'right', fill: '#8b9ae6', fontSize: 13, fontWeight: 600 }}
                      >
                        {data.typeUsage.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 5}, 70%, 60%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'pokemon' && (
              <div className="pokemon-view">
                <section className="search-section">
                  <div className="search-box glass-panel">
                    <Search className="search-icon" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search Pokémon..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </section>
                
                <div className="type-filter-bank">
                  {['Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water'].map(t => (
                     <button 
                       key={t}
                       className={`type-filter-btn ${search.toLowerCase() === t.toLowerCase() ? 'active' : ''}`}
                       onClick={() => setSearch(search.toLowerCase() === t.toLowerCase() ? '' : t)}
                     >
                       {t}
                     </button>
                  ))}
                </div>

                <div className="results-header">
                  <div className="results-title-group">
                    <h2>Rankings Breakdown</h2>
                    <span>Showing {filteredData.length} Pokémon</span>
                  </div>
                  <button 
                    className={`compact-toggle-btn ${compactMode ? 'active' : ''}`}
                    onClick={() => setCompactMode(!compactMode)}
                  >
                    Compact View
                  </button>
                </div>
                <div className={`pokemon-list ${compactMode ? 'compact-list' : ''}`}>
                  {filteredData.slice(0, 150).map((pokemon) => {
                    const realRank = data.pokemon.findIndex(p => p.name === pokemon.name) + 1;
                    return (
                      <PokemonCard 
                        key={pokemon.name} 
                        data={pokemon} 
                        rank={realRank} 
                        compact={compactMode}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
      </div>
    </div>
  );
}

export default App;
