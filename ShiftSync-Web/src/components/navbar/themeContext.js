import { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  theme: 'light', setTheme: () => {}, style: 'warm', setStyle: () => {}, navStyle: 'contrast', setNavStyle: () => {},
});

export const useTheme = () => useContext(ThemeContext);
