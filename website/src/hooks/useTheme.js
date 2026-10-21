import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "iky-theme";

function readTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#151c22" : "#e7ecf1");
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Tema tetap berlaku untuk sesi ini walau penyimpanan diblokir.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
