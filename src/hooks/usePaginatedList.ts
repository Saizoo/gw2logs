import { useEffect, useRef, useState } from 'react';

interface PageResult<T> {
  items: T[];
  hasMore: boolean;
}

interface PaginatedListState<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

// Accumulates pages into one growing list rather than replacing it on every
// fetch — a plain useApiQuery re-fetch would otherwise flash the whole list
// back to a loading state on "load more" instead of just appending.
// `fetchPage` decides for itself what "more" means (a full page came back,
// or a server-reported total hasn't been reached yet) since that differs
// between endpoints that return a total count and ones that don't.
export function usePaginatedList<T>(fetchPage: (offset: number) => Promise<PageResult<T>>, deps: unknown[]): PaginatedListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    offsetRef.current = 0;
    setLoading(true);
    setError(null);
    fetchPage(0)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setHasMore(res.hasMore);
        offsetRef.current = res.items.length;
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function loadMore() {
    setLoadingMore(true);
    fetchPage(offsetRef.current)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setHasMore(res.hasMore);
        offsetRef.current += res.items.length;
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Request failed'))
      .finally(() => setLoadingMore(false));
  }

  return { items, loading, loadingMore, error, hasMore, loadMore };
}
