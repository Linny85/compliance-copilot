import { useEffect, useMemo } from "react";

type C1Type = {
  route: string;
  inset: any;
  main: any;
  vw: number;
};

type C2Type = Array<{ tag: string; cls: string; w: number }>;

export function useLayoutDiagnostics(enabled: boolean) {
  const collect = useMemo(
    () => () => {
      const route = window.location.pathname;
      const inset = document.querySelector("[data-sidebar-inset]");
      const main = document.querySelector("main");
      const g = (el: Element | null) => (el ? getComputedStyle(el as Element) : null);

      const C1: C1Type = {
        route,
        inset: inset
          ? {
              tag: (inset as HTMLElement).tagName,
              minW: g(inset)!.minWidth,
              ofx: g(inset)!.overflowX,
            }
          : "NO INSET",
        main: main
          ? {
              tag: (main as HTMLElement).tagName,
              mw: g(main)!.maxWidth,
              ofx: g(main)!.overflowX,
              ta: g(main)!.textAlign,
            }
          : "NO MAIN",
        vw: document.documentElement.clientWidth,
      };

      const vw = document.documentElement.clientWidth;
      const offenders = Array.from(document.querySelectorAll("main, main *"))
        .filter((el) => (el as HTMLElement).offsetWidth > vw)
        .slice(0, 50)
        .map((el) => ({
          tag: (el as HTMLElement).tagName,
          cls: ((el as HTMLElement).className || "").toString().slice(0, 200),
          w: (el as HTMLElement).offsetWidth,
        }));

      const extras = {
        innerWidth: window.innerWidth,
        horizontal_scrollbar:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };

      const result = { C1, C2: offenders as C2Type, extras };
      (window as any).__layoutDiag = result;
      // Deutliche Konsolen-Ausgabe:
      // eslint-disable-next-line no-console
      console.log("[LayoutDiag]", JSON.stringify(result, null, 2));
      return result;
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;
    // Sammeln direkt nach Render und nach kurzem Delay (fonts/Layout settle)
    collect();
    const t = setTimeout(collect, 150);
    const t2 = setTimeout(collect, 600);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [enabled, collect]);

  return { collectNow: collect };
}
