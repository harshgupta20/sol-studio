import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { getEntry, isDirty } from '../../workspace/virtualWorkspace';
import { basename, languageForPath } from '../../utils/paths';
import type { ChangeType, FileEntry } from '../../types';
import { DiffView } from './DiffView';
import { Spinner } from '../ui';

// Our dark theme, registered on the Monaco instance right before the editor
// mounts. (Previously lived in a Vite-bundled monaco.ts; @monaco-editor/react
// loads Monaco via its own loader, so we register the theme through beforeMount.)
function defineSolDark(monaco: any): void {
  monaco.editor.defineTheme('sol-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5a6474', fontStyle: 'italic' },
      { token: 'keyword', foreground: '9945ff' },
      { token: 'string', foreground: '14f195' },
      { token: 'number', foreground: '4aa8ff' },
      { token: 'type', foreground: 'c9a2ff' },
    ],
    colors: {
      'editor.background': '#0f131b',
      'editor.foreground': '#e6ebf2',
      'editorLineNumber.foreground': '#3a4455',
      'editorLineNumber.activeForeground': '#8a94a6',
      'editor.selectionBackground': '#1c2230',
      'editor.lineHighlightBackground': '#11161f',
      'editorCursor.foreground': '#14f195',
      'editorGutter.background': '#0f131b',
      'editorWidget.background': '#11161f',
      'editorWidget.border': '#1c2230',
      'input.background': '#0f131b',
      'dropdown.background': '#11161f',
    },
  });
}

function changeTypeOf(entry: FileEntry): ChangeType | null {
  if (!isDirty(entry)) return null;
  if (entry.origin === 'new') return 'created';
  if (entry.content === null) return 'deleted';
  return 'modified';
}

export function EditorPane() {
  const { ws, tabs, activeTab, openingFile, setActiveTab, closeTab, editFile, revertFile } =
    useWorkspace();
  const [diffMode, setDiffMode] = useState(false);

  useEffect(() => {
    setDiffMode(false);
  }, [activeTab]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Tab bar */}
      <div className="flex items-stretch overflow-x-auto border-b border-border bg-surface">
        {tabs.length === 0 && <div className="px-3 py-2 text-xs text-faint">No file open</div>}
        {tabs.map((path) => {
          const e = ws ? getEntry(ws, path) : undefined;
          const d = e ? isDirty(e) : false;
          const active = path === activeTab;
          return (
            <div
              key={path}
              className={`group flex shrink-0 items-center gap-2 border-r border-border px-3 py-2 text-xs ${
                active ? 'bg-panel text-ink' : 'text-muted hover:bg-elevated/50'
              }`}
            >
              <button
                type="button"
                className="max-w-[160px] truncate"
                onClick={() => setActiveTab(path)}
                title={path}
              >
                {d && <span className="mr-1 text-sol">●</span>}
                {basename(path)}
              </button>
              <button
                type="button"
                className="text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
                onClick={() => closeTab(path)}
                aria-label="Close tab"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {activeTab ? (
        <ActiveFile
          key={activeTab}
          path={activeTab}
          entry={ws ? getEntry(ws, activeTab) : undefined}
          loading={openingFile === activeTab}
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          onEdit={editFile}
          onRevert={revertFile}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-faint">
          Select a file from the Explorer, or ask the agent to make a change.
        </div>
      )}
    </div>
  );
}

function ActiveFile({
  path,
  entry,
  loading,
  diffMode,
  setDiffMode,
  onEdit,
  onRevert,
}: {
  path: string;
  entry: FileEntry | undefined;
  loading: boolean;
  diffMode: boolean;
  setDiffMode: (v: boolean) => void;
  onEdit: (path: string, content: string) => void;
  onRevert: (path: string) => void;
}) {
  const dirty = entry ? isDirty(entry) : false;
  const change = entry ? changeTypeOf(entry) : null;

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs">
        <span className="mono truncate text-faint">{path}</span>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              className="text-muted hover:text-warning"
              onClick={() => onRevert(path)}
              title="Revert this file to the repository version"
            >
              Revert
            </button>
          )}
          {change && change !== 'deleted' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`rounded px-2 py-0.5 ${!diffMode ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'}`}
                onClick={() => setDiffMode(false)}
              >
                Edit
              </button>
              <button
                type="button"
                className={`rounded px-2 py-0.5 ${diffMode ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'}`}
                onClick={() => setDiffMode(true)}
              >
                Diff
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {loading && !entry?.loaded ? (
          <div className="flex h-full items-center justify-center text-sm text-faint">
            <Spinner className="mr-2" /> Loading {basename(path)}…
          </div>
        ) : entry?.binary ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-faint">
            Binary file — cannot be displayed or edited.
          </div>
        ) : entry?.content === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-faint">
            <span className="text-error">This file is deleted in the workspace.</span>
            <button type="button" className="btn-ghost text-xs" onClick={() => onRevert(path)}>
              Restore file
            </button>
          </div>
        ) : diffMode && entry ? (
          <DiffView
            oldText={entry.base ?? ''}
            newText={entry.content ?? ''}
            changeType={change ?? 'modified'}
          />
        ) : (
          <Editor
            height="100%"
            theme="sol-dark"
            beforeMount={defineSolDark}
            path={path}
            language={languageForPath(path)}
            value={entry?.content ?? ''}
            onChange={(value) => onEdit(path, value ?? '')}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderWhitespace: 'selection',
              smoothScrolling: true,
              padding: { top: 10 },
            }}
          />
        )}
      </div>
    </>
  );
}
