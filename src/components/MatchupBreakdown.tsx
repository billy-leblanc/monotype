import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedPokemon, MatchupThreat, SpeedTier } from '../types/smogon';
import { Loader2, ArrowRight, Swords, ShieldAlert, Gauge, Zap } from 'lucide-react';
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
  const [offense, setOffense] = useState<MatchupThreat[] | null>(null);
  const [speeds, setSpeeds] = useState<SpeedTier[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const typesByName = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of allPokemon) m.set(p.name, p.types);
    return m;
  }, [allPokemon]);

  // Scroll the breakdown into view whenever a (new) matchup is opened.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [yourType, oppType]);

  useEffect(() => {
    let active = true;
    setThreats(null);
    setOffense(null);
    setSpeeds(null);
    // Lazy-load the damage engine (@smogon/calc + dex data ~400KB) only on demand.
    import('../services/threatEngine').then(({ computeMatchupThreats, computeSpeedTiers }) => {
      if (!active) return;
      // Their mons breaking yours (your mons defend → bulky toggle applies here).
      setThreats(computeMatchupThreats(yourType, oppType, allPokemon, { bulkyDefenders }));
      // Your mons breaking theirs (you attack → their mons on most-used sets).
      setOffense(computeMatchupThreats(oppType, yourType, allPokemon));
      setSpeeds(computeSpeedTiers(yourType, oppType, allPokemon));
    });
    return () => {
      active = false;
    };
  }, [yourType, oppType, allPokemon, bulkyDefenders]);

  const favorable = winPct >= 50;
  const loading = threats === null || offense === null || speeds === null;

  const renderGroup = (
    list: MatchupThreat[],
    attackerType: string,
    defenderType: string,
    variant: 'offense' | 'threat'
  ) => {
    if (!list.length)
      return <p className="text-muted">Not enough set data to model this side.</p>;
    return (
      <div className="threat-list">
        {list.map((t) => (
          <div key={t.oppMon} className={`threat-row glass-panel ${variant}`}>
            <div className="threat-main">
              <div className="threat-id">
                <span className={`side-tag side-${variant}`}>{attackerType}</span>
                <span className="threat-name">{t.oppMon}</span>
                <TypeBadges types={typesByName.get(t.oppMon) ?? [attackerType]} />
                <span className="threat-usage">{t.oppUsage.toFixed(1)}% used</span>
              </div>
              <div className="threat-share" title="Share of this side's pressure">
                <div className={`threat-share-bar bar-${variant}`} style={{ width: `${t.sharePct}%` }} />
                <span>{t.sharePct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="threat-victims">
              <span className="victims-label">
                <ArrowRight size={13} />
                {variant === 'offense' ? `breaks their ${defenderType}:` : `beats your ${defenderType}:`}
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
    );
  };

  return (
    <div className="matchup-breakdown" ref={rootRef}>
      <div className="breakdown-head">
        <div className="breakdown-title-row">
          <h3>
            <span style={{ color: typeColor(yourType) }}>{yourType}</span> vs{' '}
            <span style={{ color: typeColor(oppType) }}>{oppType}</span> — what decides it
          </h3>
          <div className="defender-toggle" role="group" aria-label="Your mons' spreads">
            <button className={!bulkyDefenders ? 'active' : ''} onClick={() => bulkyDefenders && onToggleBulky()}>
              Offensive
            </button>
            <button className={bulkyDefenders ? 'active' : ''} onClick={() => !bulkyDefenders && onToggleBulky()}>
              Bulky
            </button>
          </div>
        </div>
        <p className="breakdown-sub">
          {yourType} {favorable ? 'wins' : 'wins only'} <strong>{winPct.toFixed(1)}%</strong> overall.
          Below: who outspeeds whom, the {oppType} mons you break, and the ones that break you — live
          damage calc on {bulkyDefenders ? 'bulky' : 'most-used'} spreads.
        </p>
      </div>

      {loading ? (
        <div className="breakdown-loading">
          <Loader2 className="spinner" size={28} /> Running damage &amp; speed calcs…
        </div>
      ) : (
        <>
          {/* Speed tiers */}
          <div className="breakdown-section">
            <h4 className="breakdown-section-title">
              <Gauge size={15} /> Speed tiers <span className="hint">— who moves first (most-used sets)</span>
            </h4>
            <div className="speed-tiers">
              {speeds!.map((s) => (
                <div key={`${s.side}-${s.name}`} className={`speed-row side-${s.side}`}>
                  <span className="speed-val">{s.speed}</span>
                  <span className={`speed-dot ${s.side}`} />
                  <span className="speed-name">{s.name}</span>
                  {s.scarf && (
                    <span className="speed-scarf" title="Choice Scarf (×1.5)">
                      <Zap size={11} /> Scarf
                    </span>
                  )}
                  <TypeBadges types={s.types} />
                </div>
              ))}
            </div>
            <div className="speed-legend">
              <span><span className="speed-dot you" /> your {yourType}</span>
              <span><span className="speed-dot opp" /> their {oppType}</span>
            </div>
          </div>

          {/* Your offense (flip side) */}
          <div className="breakdown-section">
            <h4 className="breakdown-section-title offense">
              <Swords size={15} /> Your {yourType} mons that break {oppType}
            </h4>
            {renderGroup(offense!, yourType, oppType, 'offense')}
          </div>

          {/* Their threats */}
          <div className="breakdown-section">
            <h4 className="breakdown-section-title threat">
              <ShieldAlert size={15} /> {oppType} mons that break your {yourType}
            </h4>
            {renderGroup(threats!, oppType, yourType, 'threat')}
          </div>
        </>
      )}
    </div>
  );
}
