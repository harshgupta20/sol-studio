import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { effectivePaths } from '../../workspace/virtualWorkspace';
import { isExplorerHidden } from '../../workspace/ignore';
import type { ChangeType } from '../../types';
import { CHANGE_MARK } from '../ui';

interface TreeNode {
  name: string;
  path: string;
  dir: boolean;
  children: Map<string, TreeNode>;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', dir: true, children: new Map() };
  for (const p of paths) {
    const parts = p.split('/');
    let node = root;
    parts.forEach((part, idx) => {
      const isFile = idx === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, idx + 1).join('/'),
          dir: !isFile,
          children: new Map(),
        };
        node.children.set(part, child);
      }
      node = child;
    });
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.dir !== b.dir) return a.dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function Explorer() {
  const { ws, activeTab, openFile, changes, truncated } = useWorkspace();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const paths = useMemo(
    () => (ws ? effectivePaths(ws).filter((p) => !isExplorerHidden(p)) : []),
    [ws],
  );
  const tree = useMemo(() => buildTree(paths), [paths]);
  const changeMap = useMemo(() => {
    const m = new Map<string, ChangeType>();
    for (const c of changes) m.set(c.path, c.changeType);
    return m;
  }, [changes]);

  // Auto-expand top-level directories on load.
  useEffect(() => {
    const top = new Set<string>();
    for (const n of sortedChildren(tree)) if (n.dir) top.add(n.path);
    setExpanded(top);
  }, [ws?.tree]);

  // Ensure ancestors of changed files are expanded so they're visible.
  useEffect(() => {
    if (!changes.length) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const c of changes) {
        const parts = c.path.split('/');
        for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'));
      }
      return next;
    });
  }, [changes]);

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (!ws) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Explorer</span>
        <span className="mono text-[10px] text-faint">{paths.length}</span>
      </div>
      <div className="flex-1 overflow-auto py-1 text-sm">
        {sortedChildren(tree).map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={0}
            expanded={expanded}
            activeTab={activeTab}
            changeMap={changeMap}
            onToggle={toggle}
            onOpen={openFile}
          />
        ))}
      </div>
      {truncated && (
        <div className="border-t border-border px-3 py-2 text-[10px] text-warning">
          ⚠ Large repo — file tree was truncated by GitHub.
        </div>
      )}
    </div>
  );
}

function TreeItem({
  node,
  depth,
  expanded,
  activeTab,
  changeMap,
  onToggle,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  activeTab: string | null;
  changeMap: Map<string, ChangeType>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
}) {
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.dir) {
    const open = expanded.has(node.path);
    return (
      <div>
        <button
          type="button"
          style={pad}
          onClick={() => onToggle(node.path)}
          className="flex w-full items-center gap-1 py-1 pr-2 text-left text-muted hover:bg-elevated/50 hover:text-ink"
        >
          <span className="mono w-3 text-faint">{open ? '▾' : '▸'}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          sortedChildren(node).map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              activeTab={activeTab}
              changeMap={changeMap}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
      </div>
    );
  }

  const change = changeMap.get(node.path);
  const mark = change ? CHANGE_MARK[change] : null;
  const active = activeTab === node.path;
  return (
    <button
      type="button"
      style={pad}
      onClick={() => onOpen(node.path)}
      className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left ${
        active ? 'bg-elevated text-ink' : 'text-muted hover:bg-elevated/50 hover:text-ink'
      }`}
      title={node.path}
    >
      <span className="w-3" />
      <span className="truncate">{node.name}</span>
      {mark && <span className={`mono ml-auto text-[10px] font-bold ${mark.color}`}>{mark.mark}</span>}
    </button>
  );
}
