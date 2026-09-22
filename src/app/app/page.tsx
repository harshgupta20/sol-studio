'use client';

// The studio route (/app). The workspace is a browser-only SPA (Monaco, local
// storage, direct GitHub/AI fetches), so it is loaded with ssr:false — it never
// runs on the server. A GitHub OAuth redirect also lands here (/app?code=…),
// where the connect screen completes the token exchange.

import dynamic from 'next/dynamic';

const StudioRoot = dynamic(() => import('@/StudioRoot'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-sol" />
    </div>
  ),
});

export default function AppPage() {
  return <StudioRoot />;
}
