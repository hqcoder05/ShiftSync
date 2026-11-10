import { useEffect, useState } from "react";
import { ThemeContext } from './themeContext.js';

const THEME_KEY = "shiftsync-theme";
const STYLE_KEY = "shiftsync-style";
const NAV_STYLE_KEY = "shiftsync-nav-style";


/**
 * ThemeProvider: Quản lý toàn diện Theme (Sáng/Tối), Style (Bảng màu) và Navbar Style.
 * Lưu vĩnh viễn trong localStorage và phản ánh trực tiếp lên dataset trên <html>.
 */
export function ThemeProvider({
  children,
  initial = "light",
  onChange,
}) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(THEME_KEY) ?? initial
  );
  const [style, setStyleState] = useState(
    () => localStorage.getItem(STYLE_KEY) ?? "warm"
  );
  const [navStyle, setNavStyleState] = useState(
    () => localStorage.getItem(NAV_STYLE_KEY) ?? "contrast"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.style = style;
    document.documentElement.dataset.navStyle = navStyle;
    document.documentElement.style.colorScheme = theme;
  }, [theme, style, navStyle]);

  const setTheme = (t) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
    onChange?.({ theme: t, style, navStyle });
  };

  const setStyle = (s) => {
    localStorage.setItem(STYLE_KEY, s);
    setStyleState(s);
    onChange?.({ theme, style: s, navStyle });
  };

  const setNavStyle = (ns) => {
    localStorage.setItem(NAV_STYLE_KEY, ns);
    setNavStyleState(ns);
    onChange?.({ theme, style, navStyle: ns });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, style, setStyle, navStyle, setNavStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
