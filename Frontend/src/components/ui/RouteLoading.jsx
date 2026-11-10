import { PageLoader } from './PageLoader.jsx';

// Suspense fallback while a lazy-loaded page downloads.
export function RouteLoading() {
  return <PageLoader label="Loading page" />;
}
