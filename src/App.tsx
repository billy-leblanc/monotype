import { useEffect, useState } from 'react';
import { fetchStats } from './services/statsFetcher';
import type { ParsedPokemon } from './types/smogon';
import { PokemonCard } from './components/PokemonCard';
import { Search, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [data, setData] = useState<ParsedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const stats = await fetchStats();
        setData(stats);
      } catch (err) {
        setError("Failed to load Showdown statistics. Try refreshing.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredData = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="title">
            <span className="title-gradient">Monotype Analyzer</span>
          </h1>
          <p className="subtitle">
            Gen 9 Monotype (1630 Standard) Usage & Tactical Data
          </p>
        </div>
      </header>

      <main className="app-main">
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

        {loading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={48} />
            <p>Gathering latest Showdown Data...</p>
          </div>
        ) : error ? (
          <div className="error-state glass-panel">
            <p>{error}</p>
          </div>
        ) : (
          <div className="results-container">
            <div className="results-header">
              <h2>Rankings Breakdown</h2>
              <span>Showing {filteredData.length} Pokémon</span>
            </div>
            <div className="pokemon-list">
              {filteredData.slice(0, 150).map((pokemon) => {
                // Find actual rank based on sorted data index (not filtered index)
                const realRank = data.findIndex(p => p.name === pokemon.name) + 1;
                return (
                  <PokemonCard 
                    key={pokemon.name} 
                    data={pokemon} 
                    rank={realRank} 
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
