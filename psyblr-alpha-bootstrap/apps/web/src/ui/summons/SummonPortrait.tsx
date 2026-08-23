import { useState } from 'react';
import type { SummonDefinition } from '@psyblr/contracts';
import { getSummonPresentation } from '../../game/summonPresentation';

type SummonPortraitProps = {
  definition: SummonDefinition;
  size?: 'card' | 'drawer';
};

export function SummonPortrait({ definition, size = 'card' }: SummonPortraitProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getSummonPresentation(definition.id);
  const initials = definition.displayName.slice(0, 2).toUpperCase();

  if (definition.portraitUrl && !imageFailed) {
    return <img
      className={`summon-portrait summon-portrait-${size}`}
      src={definition.portraitUrl}
      alt={`${definition.displayName} portrait`}
      onError={() => setImageFailed(true)}
    />;
  }

  return <div
    className={`summon-portrait summon-portrait-${size} summon-portrait-placeholder`}
    style={{ background: presentation.portraitBackground, borderColor: presentation.accentMuted }}
    aria-label={`${definition.displayName} placeholder portrait`}
  >
    <span className="summon-portrait-halo" style={{ backgroundColor: presentation.accent }} />
    <strong>{initials}</strong>
  </div>;
}
