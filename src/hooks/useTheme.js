import { useEffect, useState } from 'react';

export function useTheme() {
  const [light, setLight] = useState(
    () => localStorage.getItem('theme') === 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return { light, toggle: () => setLight((v) => !v) };
}
