'use client';

// The application shell: providers + the studio. Loaded only on the /app route
// (dynamically, ssr:false) so the marketing landing page never pulls in the
// heavy editor bundle or touches browser-only APIs during server rendering.

import Studio from './Studio';
import { GitHubProvider } from './state/GitHubContext';
import { AIProvider } from './state/AIContext';
import { WorkspaceProvider } from './state/WorkspaceContext';

export default function StudioRoot() {
  return (
    <GitHubProvider>
      <AIProvider>
        <WorkspaceProvider>
          <Studio />
        </WorkspaceProvider>
      </AIProvider>
    </GitHubProvider>
  );
}
