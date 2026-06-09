const THEME_INIT_SCRIPT = `(function(){try{var k='clickin-theme';var t=localStorage.getItem(k);var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

/**
 * Blocking theme script for the root layout <head>.
 * Must be a native <script> in a Server Component — next/script is client-only
 * and inline scripts there do not run (React 19 / Next.js 16).
 */
export function ThemeInitScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
