/** Runs before paint to apply saved theme and avoid flash */
export function ThemeInitScript() {
  const script = `(function(){try{var k='clickin-theme';var t=localStorage.getItem(k);var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(d?'dark':'light');}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
