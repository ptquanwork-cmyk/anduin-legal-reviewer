'use client';
import dynamic from 'next/dynamic';

// The workspace is private to the browser session (anonymous auth, URL-driven screen), so it renders client-side only.
const App = dynamic(() => import('../components/App'), { ssr: false });

export default function Page() {
  return <App />;
}
