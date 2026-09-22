import { useEffect, useRef, useState } from 'react';
import { useAI } from '../../state/AIContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import type { ActivityItem, Plan } from '../../types';
import { Banner, SectionLabel, Spinner, StatusGlyph } from '../ui';
import { ProviderIcon } from '../ai/ProviderIcon';

const BUSY_PHASES = new Set(['analyzing', 'planning', 'implementing', 'applying']);

export function AgentPanel({
  onViewChanges,
  onOpenAISettings,
}: {
  onViewChanges: () => void;
  onOpenAISettings: () => void;
}) {
  const ai = useAI();
  const {
    run,
    analyzeRepository,
    submitRequirement,
    approvePlan,
    rejectPlan,
    qa,
    qaStreaming,
    qaBusy,
    askQuestion,
  } = useWorkspace();
  const [mode, setMode] = useState<'build' | 'ask'>('build');
  const [requirement, setRequirement] = useState('');
  const [question, setQuestion] = useState('');
  const busy = BUSY_PHASES.has(run.phase);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <span className="mr-auto flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
          <ProviderIcon provider={ai.provider} size={14} />
          AI Agent
        </span>
        {(['build', 'ask'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-2 py-0.5 text-xs capitalize ${
              mode === m ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {!ai.configured && (
        <div className="p-3">
          <Banner kind="warning">
            Add your AI API key to use the agent.{' '}
            <button className="underline" onClick={onOpenAISettings}>
              Open AI settings
            </button>
          </Banner>
        </div>
      )}

      {mode === 'build' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-auto p-3">
            {/* Analyze */}
            <div className="card p-3">
              <div className="flex items-center justify-between">
                <SectionLabel>Repository</SectionLabel>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!ai.configured || busy}
                  onClick={() => void analyzeRepository()}
                >
                  {run.phase === 'analyzing' ? <Spinner /> : run.analysis ? 'Re-analyze' : 'Analyze'}
                </button>
              </div>
              {run.analysis ? (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-ink/90">{run.analysis.summary}</p>
                  <div className="text-xs text-faint">
                    {run.analysis.projectType}
                    {run.analysis.framework && run.analysis.framework !== 'unknown'
                      ? ` · ${run.analysis.framework}`
                      : ''}
                  </div>
                  {run.analysis.observations.length > 0 && (
                    <ul className="space-y-0.5">
                      {run.analysis.observations.slice(0, 6).map((o, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-muted">
                          <span className="text-sol">·</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs text-faint">
                  Have the agent read a curated slice of the repo to understand it.
                </p>
              )}
            </div>

            {/* Requirement */}
            <div className="card p-3">
              <SectionLabel>Requirement</SectionLabel>
              <textarea
                className="input mt-1 min-h-[72px] resize-y text-sm"
                placeholder="e.g. Add a Solana wallet connect button using the existing architecture. Use devnet and keep it modular."
                value={requirement}
                disabled={busy}
                onChange={(e) => setRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    void submitRequirement(requirement);
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary mt-2 w-full"
                disabled={!ai.configured || busy || !requirement.trim()}
                onClick={() => void submitRequirement(requirement)}
              >
                {run.phase === 'planning' ? (
                  <>
                    <Spinner /> Generating plan…
                  </>
                ) : (
                  'Generate plan'
                )}
              </button>
            </div>

            {run.plan && (
              <PlanCard
                plan={run.plan}
                phase={run.phase}
                onApprove={() => void approvePlan()}
                onReject={rejectPlan}
              />
            )}

            {run.phase === 'implementing' && (
              <div className="card flex items-center gap-2 p-3 text-sm text-muted">
                <Spinner /> Generating file changes…
              </div>
            )}

            {run.implementation && run.phase === 'ready' && (
              <div className="card animate-fadeIn border-success/20 p-3">
                <SectionLabel>Changes generated</SectionLabel>
                <p className="text-sm text-ink/90">{run.implementation.summary}</p>
                {run.applyResult && (
                  <div className="mt-2 text-xs text-muted">
                    Applied {run.applyResult.applied.length} file(s) to the workspace
                    {run.applyResult.skipped.length > 0 && (
                      <span className="text-warning">
                        {' '}
                        · {run.applyResult.skipped.length} skipped
                      </span>
                    )}
                    .
                  </div>
                )}
                {run.applyResult && run.applyResult.skipped.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {run.applyResult.skipped.map((s, i) => (
                      <li key={i} className="mono text-[11px] text-warning">
                        {s.path}: {s.reason}
                      </li>
                    ))}
                  </ul>
                )}
                {run.implementation.notes && run.implementation.notes.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] uppercase tracking-wider text-faint">Notes</div>
                    <ul className="mt-0.5 space-y-0.5">
                      {run.implementation.notes.map((n, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-muted">
                          <span className="text-sol">·</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" className="btn-primary mt-3 w-full" onClick={onViewChanges}>
                  Review changes →
                </button>
              </div>
            )}

            {run.error && <Banner>{run.error}</Banner>}

            <Activity items={run.activity} />
          </div>
        </div>
      ) : (
        <AskPane
          qa={qa}
          streaming={qaStreaming}
          busy={qaBusy}
          configured={ai.configured}
          question={question}
          setQuestion={setQuestion}
          onAsk={() => {
            void askQuestion(question);
            setQuestion('');
          }}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  phase,
  onApprove,
  onReject,
}: {
  plan: Plan;
  phase: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canDecide = phase === 'awaiting_approval';
  return (
    <div className="card animate-fadeIn overflow-hidden border-warning/20">
      <div className="flex items-center justify-between border-b border-border bg-elevated px-3 py-2">
        <span className="text-sm font-semibold text-ink">Proposed plan</span>
        <span className="badge border-warning/30 bg-warning/10 text-warning">
          {canDecide ? 'Awaiting approval' : 'Approved'}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <p className="text-sm text-ink/90">{plan.summary}</p>
        {plan.requirements.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-faint">Requirements</div>
            <ul className="space-y-0.5">
              {plan.requirements.map((r, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-muted">
                  <span className="text-sol">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-faint">Steps</div>
          <ol className="space-y-1.5">
            {plan.steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-2 rounded-md border border-border/60 bg-surface/50 px-2.5 py-1.5">
                <span className="mono text-xs text-faint">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm text-ink">{s.title}</div>
                  {s.description && <div className="mt-0.5 text-xs text-faint">{s.description}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        {canDecide && (
          <div className="flex gap-2 border-t border-border pt-3">
            <button type="button" className="btn-primary flex-1" onClick={onApprove}>
              Approve plan
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={onReject}>
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ACT_KIND = {
  info: 'pending',
  running: 'running',
  success: 'success',
  error: 'error',
  warning: 'warning',
} as const;

function Activity({ items }: { items: ActivityItem[] }) {
  if (!items.length) return null;
  return (
    <div className="card p-3">
      <SectionLabel>Activity</SectionLabel>
      <ul className="space-y-1.5">
        {[...items].reverse().map((it) => (
          <li key={it.id} className="flex items-start gap-2 text-xs">
            <StatusGlyph kind={ACT_KIND[it.status]} className="mt-0.5" />
            <div className="min-w-0">
              <div className="text-ink/90">{it.message}</div>
              {it.detail && <div className="mt-0.5 whitespace-pre-wrap break-words text-[11px] text-faint">{it.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AskPane({
  qa,
  streaming,
  busy,
  configured,
  question,
  setQuestion,
  onAsk,
}: {
  qa: { id: string; role: 'user' | 'agent'; content: string }[];
  streaming: string | null;
  busy: boolean;
  configured: boolean;
  question: string;
  setQuestion: (v: string) => void;
  onAsk: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qa, streaming]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {qa.length === 0 && !streaming && (
          <p className="text-xs text-faint">
            Ask anything about this repository — architecture, where something lives, how a feature
            works. Answers use the repository context.
          </p>
        )}
        {qa.map((m) => (
          <div
            key={m.id}
            className={`rounded-md px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'border border-border bg-surface text-ink'
                : 'bg-elevated/50 text-ink/90'
            }`}
          >
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-faint">
              {m.role === 'user' ? 'You' : 'Agent'}
            </div>
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
          </div>
        ))}
        {streaming !== null && (
          <div className="rounded-md bg-elevated/50 px-3 py-2 text-sm text-ink/90">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-faint">Agent</div>
            <div className="whitespace-pre-wrap break-words">
              {streaming || <Spinner />}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <textarea
          className="input min-h-[52px] resize-y text-sm"
          placeholder="Ask about this repository…"
          value={question}
          disabled={!configured || busy}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (question.trim()) onAsk();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary mt-2 w-full"
          disabled={!configured || busy || !question.trim()}
          onClick={onAsk}
        >
          {busy ? <><Spinner /> Thinking…</> : 'Ask'}
        </button>
      </div>
    </div>
  );
}
