import { useEffect } from 'react';
import { withUnifiedAdminSidebar } from './adminSidebar.js';

export function AdminScreen({ page }) {
  useEffect(() => {
    document.title = page.title;
    document.body.className = page.bodyClass || '';
    document.body.dataset.page = page.pageKey || '';

    let cancelled = false;

    import('../../features/dashboard/dashboard.runtime.js')
      .then(() => {
        if (cancelled) {
          return;
        }
      })
      .catch((error) => {
        console.error('Cannot boot admin runtime', error);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  return <div dangerouslySetInnerHTML={{ __html: withUnifiedAdminSidebar(page.markup) }} />;
}
