import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import vi from './vi';
import en from './en';
export const LANGUAGE_KEY = '@settings:language';
export const dictionaries = { vi, en };
export const translate = (language, key) => dictionaries[language]?.[key] ?? vi[key] ?? key;
const Context = createContext({ language: 'vi', t: (key) => translate('vi', key), setLanguage: async () => {} });
export function I18nProvider({ children }) {
  const [language, update] = useState('vi');
  const edited = useRef(false), writes = useRef(Promise.resolve());
  useEffect(() => { let alive = true; AsyncStorage.getItem(LANGUAGE_KEY).then((value) => { if (alive && !edited.current && dictionaries[value]) update(value); }).catch(() => {}); return () => { alive = false; }; }, []);
  const setLanguage = async (value) => {
    if (!dictionaries[value]) return;
    edited.current = true; update(value);
    const work = writes.current.then(() => AsyncStorage.setItem(LANGUAGE_KEY, value));
    writes.current = work.catch(() => {});
    await work;
  };
  return <Context.Provider value={{ language, setLanguage, t: (key) => translate(language, key) }}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);
