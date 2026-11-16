/* CODIVIA platform — catches render crashes so one broken page never blanks the whole app.
 *
 * <ErrorBoundary variant="full">  around the whole app (last line of defence)
 * <ErrorBoundary resetKey={pathname}>  around the routed pages: going to another page clears the error
 *
 * A lazy page that fails to download (usually a new deploy replaced the old files, or the network
 * dropped) gets its own message with a Reload button, since retrying the render cannot fix it.
 */
import { Component } from 'react';
import { ErrorState } from './ErrorState.jsx';

const isChunkError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|ChunkLoadError/i.test(
    String((error && (error.message || error.name)) || error),
  );

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info && info.componentStack);
  }

  componentDidUpdate(prev) {
    // Another page was opened: give it a fresh start.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const variant = this.props.variant || 'page';
    const reload = () => window.location.reload();
    if (isChunkError(error)) {
      return (
        <ErrorState
          variant={variant}
          icon="⟳"
          title="This page needs a refresh"
          message="CODIVIA was updated, or the connection dropped while the page was loading. Reload to get the latest version — your saved work is kept."
          onRetry={reload}
          retryLabel="Reload"
        />
      );
    }
    return (
      <ErrorState
        variant={variant}
        title="Something went wrong on this page"
        message="The rest of CODIVIA still works. Try again, or go back to the home page. Work in the coding workspace is autosaved."
        onRetry={() => this.setState({ error: null })}
        actions={[
          { label: 'Go to home', onClick: () => window.location.assign('/') },
          { label: 'Reload', onClick: reload },
        ]}
        details={import.meta.env.DEV ? String((error && error.stack) || error) : undefined}
      />
    );
  }
}
