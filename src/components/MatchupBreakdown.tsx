import { useEffect, useState } from 'react';
import type { ParsedPokemon, MatchupThreat } from '../types/smogon';
import { Swords, Loader2, Target } from 'lucide-react';

interface Props {
  yourType: string;
  oppType: string;
  winPct: number;
  allPokemon: ParsedPokemon[];
  bulkyDefenders: boolean;
  onToggleBulky: () => void;
}

function koClass(n: number): string {
  if (n === 1) return 'ko-ohko';
  if (n === 2) return 'ko-2hko';
  return 'ko-chip';
}

export function MatchupBreakdown({
  yourType,
  oppType,
  winPct,
  allPokemon,
  bulkyDefenders,
  onToggleBulky,
}: Props) {
  const [threats, setThreats] = useState<MatchupThreat[] | null>(null);

  useEffect(() => {
    let active = true;
    setThreats(null);
    // Lazy-load the damage engine (@smogon/calc + dex data ~400KB) only when a
    // matchup is actually opened, keeping it out of the initial bundle.
    import('../services/threatEngine').then(({ computeMatchupThreats }) => {
      const result = computeMatchupThreats(yourType, oppType, allPokemon, { bulkyDefenders });
      if (active) setThreats(result);
    });
    return () => {
      active = false;
    };
  }, [yourType, oppType, allPokemon, bulkyDefenders]);

  const losing = winPct < 50;

  return (
    <div className="matchup-breakdown">
      <div className="breakdown-head">
        <div className="breakdown-title-row">
          <h3>
            <Swords size={18} />
            Why {yourType} {losing ? 'loses to' : 'fares vs'} {oppType}
          </h3>
          <div className="defender-toggle" role="group" aria-label="Your mons' spreads">
            <button
              className={!bulkyDefenders ? 'active' : ''}
              onClick={() => bulkyDefenders && onToggleBulky()}
            >
              Offensive
            </button>
            <button
              className={bulkyDefenders ? 'active' : ''}
              onClick={() => !bulkyDefenders && onToggleBulky()}
            >
              Bulky
            </button>
          </div>
        </div>
        <p className="breakdown-sub">
          {yourType} wins <strong>{winPct.toFixed(1)}%</strong>. These {oppType} mons drive the
          {losing ? ` ${(100 - winPct).toFixed(1)}% of losses` : ' result'} — ranked by usage × how
          hard they break your {yourType} mons on their{' '}
          <strong>{bulkyDefenders ? 'bulkiest' : 'most-used'}</strong> spreads (live damage calc).
        </p>
      </div>

      {threats === null ? (
        <div className="breakdown-loading">
          <Loader2 className="spinner" size={28} /> Running damage calcs…
        </div>
      ) : threats.length === 0 ? (
        <p className="text-muted">Not enough set data to model this matchup.</p>
      ) : (
        <div className="threat-list">
          {threats.map((t) => (
            <div key={t.oppMon} className="threat-row glass-panel">
              <div className="threat-main">
                <div className="threat-id">
                  <span className="threat-name">{t.oppMon}</span>
                  <span className="threat-usage">{t.oppUsage.toFixed(1)}% used</span>
                </div>
                <div className="threat-share" title="Share of this matchup's threat pressure">
                  <div className="threat-share-bar" style={{ width: `${t.sharePct}%` }} />
                  <span>{t.sharePct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="threat-victims">
                <Target size={13} className="victim-icon" />
                {t.victims.map((v, i) => (
                  <span key={v.yourMon} className="victim">
                    <span className="victim-mon">{v.yourMon}</span>
                    <span className={`victim-ko ${koClass(v.n)}`}>
                      {v.move} · {v.koText}
                    </span>
                    {i < t.victims.length - 1 && <span className="victim-sep">·</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
