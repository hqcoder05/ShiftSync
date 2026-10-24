import { createContext, useContext, useEffect, useState } from "react";

const THEME_KEY = "shiftsync-theme";
const STYLE_KEY = "shiftsync-style";
const NAV_STYLE_KEY = "shiftsync-nav-style";

export const THEME_STYLES = [
  {
    id: "warm",
    name: "Warm Roast",
    tagline: "Ấm áp • Cà phê & Hổ phách",
    badge: "Khuyên dùng cho F&B",
    primaryColor: "#d97706",
    navColor: "#1c140e",
    bgColor: "#faf7f2",
    accentColor: "#ea580c",
    desc: "Tông màu ấm cúng, sang trọng, màu cà phê nướng và hổ phách tự nhiên. Rất phù hợp với không gian chuỗi cà phê và nhà hàng.",
  },
  {
    id: "emerald",
    name: "Modern Mint",
    tagline: "Tươi mới • Xanh ngọc lục bảo",
    badge: "Năng động",
    primaryColor: "#0f9d68",
    navColor: "#082117",
    bgColor: "#f4f8f6",
    accentColor: "#0284c7",
    desc: "Tông xanh bạc hà tươi mát, năng động, mang lại cảm giác sạch sẽ, hiện đại và tràn đầy năng lượng.",
  },
  {
    id: "ocean",
    name: "Classic Slate",
    tagline: "Thanh lịch • Xanh công nghệ & Xám",
    badge: "Chuẩn Doanh nghiệp",
    primaryColor: "#2563eb",
    navColor: "#0f172a",
    bgColor: "#f8fafc",
    accentColor: "#0284c7",
    desc: "Tông màu công nghệ trung tính, chuẩn mực SaaS quốc tế, tạo cảm giác chuyên nghiệp và đáng tin cậy.",
  },
  {
    id: "minimal",
    name: "Minimalist Studio",
    tagline: "Tối giản • Đen trắng Monochrome",
    badge: "Tập trung cao độ",
    primaryColor: "#18181b",
    navColor: "#18181b",
    bgColor: "#ffffff",
    accentColor: "#52525b",
    desc: "Giao diện đơn sắc tinh gọn, loại bỏ mọi chi tiết phân tâm để người quản lý tập trung tối đa vào số liệu.",
  },
];

const Ctx = createContext({
  theme: "light",
  setTheme: () => {},
  style: "warm",
  setStyle: () => {},
  navStyle: "contrast",
  setNavStyle: () => {},
});

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
    <Ctx.Provider value={{ theme, setTheme, style, setStyle, navStyle, setNavStyle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
