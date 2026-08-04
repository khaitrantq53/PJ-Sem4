import { useEffect } from 'react';

export function PageShell({ beforeRuntimeLoad, page, runtimeLoader }) {
  useEffect(() => {
    document.title = page.title;
    document.body.className = page.bodyClass || '';
    document.body.dataset.page = page.pageKey || '';

    let cancelled = false;
    const bootstrap = async () => {
      await beforeRuntimeLoad?.();

      if (!cancelled) {
        await runtimeLoader?.();
      }
    };

    bootstrap().catch((error) => {
      console.error('Cannot boot page runtime', error);
    });

    return () => {
      cancelled = true;
    };
  }, [beforeRuntimeLoad, page, runtimeLoader]);

  return <div dangerouslySetInnerHTML={{ __html: page.markup }} />;
}
