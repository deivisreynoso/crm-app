import Script from "next/script";

const THEME_INIT_SCRIPT = `(function(){try{var k='clickin-theme';var t=localStorage.getItem(k);var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

/** Runs before hydration to apply saved theme and avoid flash. */
export function ThemeInitScript() {
  return (
    <Script
      id="clickin-theme-init"
      strategy="beforeInteractive"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
