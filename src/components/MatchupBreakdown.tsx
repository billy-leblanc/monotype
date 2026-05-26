import { useEffect, useMemo, useState } from 'react';
import type { ParsedPokemon, MatchupThreat } from '../types/smogon';
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { typeColor } from '../utils/typeColors';

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

function TypeBadges({ types }: { types: string[] }) {
  return (
    <span className="type-badges">
      {types.map((t) => (
        <span key={t} className="type-badge" style={{ background: typeColor(t) }}>
          {t}
        </span>
      ))}
    </span>
  );
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

  // name -> types lookup so we can show (and prove) each mon's real typing
  const typesByName = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of allPokemon) m.set(p.name, p.types);
    return m;
  }, [allPokemon]);

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

  const favorable = winPct >= 50;

  return (
    <div className="matchup-breakdown">
      <div className="breakdown-head">
        <div className="breakdown-title-row">
          <h3>
            <AlertTriangle size={18} />
            Biggest <span style={{ color: typeColor(oppType) }}>{oppType}</span> threats to your{' '}
            <span style={{ color: typeColor(yourType) }}>{yourType}</span> team
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
          {yourType} {favorable ? 'wins' : 'wins only'} <strong>{winPct.toFixed(1)}%</strong> of this
          matchup overall. Each row is an <strong>opposing {oppType} mon</strong> and the{' '}
          <strong>{yourType} mons of yours</strong> it beats — ranked by usage × KO power on your
          team's <strong>{bulkyDefenders ? 'bulkiest' : 'most-used'}</strong> spreads (live damage
          calc).
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
                  <span className="side-tag side-threat">{oppType} threat</span>
                  <span className="threat-name">{t.oppMon}</span>
                  <TypeBadges types={typesByName.get(t.oppMon) ?? [oppType]} />
                  <span className="threat-usage">{t.oppUsage.toFixed(1)}% used</span>
                </div>
                <div className="threat-share" title="Share of this matchup's threat pressure">
                  <div className="threat-share-bar" style={{ width: `${t.sharePct}%` }} />
                  <span>{t.sharePct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="threat-victims">
                <span className="victims-label">
                  <ArrowRight size={13} /> beats your {yourType}:
                </span>
                {t.victims.map((v) => (
                  <span key={v.yourMon} className="victim">
                    <span className="victim-mon">{v.yourMon}</span>
                    <span className={`victim-ko ${koClass(v.n)}`}>
                      {v.move} · {v.koText}
                    </span>
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
