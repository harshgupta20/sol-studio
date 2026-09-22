import { Fragment } from 'react';

const STAGES = ['GitHub', 'Understand', 'Plan', 'Implement', 'Review', 'PR'];

/** Compact animated GitHub → … → PR pipeline used in the hero. */
export function PipelineStrip({ className = '' }: { className?: string }) {
  return (
    <div className={`pipe flex-wrap gap-y-2 ${className}`}>
      {STAGES.map((s, i) => (
        <Fragment key={s}>
          <span className="pipe-node">
            <span className={i === 0 || i === STAGES.length - 1 ? 'text-aqua' : 'text-violet'}>◆</span>
            {s}
          </span>
          {i < STAGES.length - 1 && <span className="pipe-link" style={{ animationDelay: `${i * 0.3}s` }} />}
        </Fragment>
      ))}
    </div>
  );
}
