import { useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { DataProvider } from "./data";
import Home from "./pages/Home";
import Formula from "./pages/Formula";
import Dna from "./pages/Dna";
import Legends from "./pages/Legends";
import PlayerPage from "./pages/PlayerPage";
import Versus from "./pages/Versus";
import Nations from "./pages/Nations";
import Records from "./pages/Records";
import Archive, { EditionPage } from "./pages/Archive";
import About from "./pages/About";
import Goat from "./pages/Goat";
import Specialist from "./pages/Specialist";
import ChampionDna from "./pages/ChampionDna";

const NAV = [
  ["/goat", "GOAT"],
  ["/champion-dna", "챔피언 DNA"],
  ["/specialist", "스페셜리스트"],
  ["/dna", "메이저 DNA"],
  ["/formula", "우승의 공식"],
  ["/nations", "미국 vs 세계"],
  ["/legends", "메이저 기록"],
  ["/versus", "전설의 대결"],
  ["/records", "명승부"],
  ["/archive", "아카이브"],
  ["/about", "데이터"],
] as const;

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-gold/30 bg-green-deep text-ivory">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-serif text-lg font-bold">메이저의 공식</span>
          <span className="hidden text-[11px] tracking-[0.25em] text-gold-light sm:inline">THE MAJOR FORMULA</span>
        </NavLink>
        <button className="rounded border border-ivory/30 px-2 py-1 text-sm xl:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          메뉴
        </button>
        <nav className="hidden gap-3 xl:flex">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `text-sm ${isActive ? "text-gold-light" : "text-ivory/85 hover:text-ivory"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      {open && (
        <nav className="grid grid-cols-2 gap-1 border-t border-ivory/10 px-4 pb-3 sm:grid-cols-3 xl:hidden">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className="py-2 text-sm text-ivory/90">
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-charcoal/10 bg-ivory-dark/60">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-charcoal-soft sm:px-6">
        <p>databrew SPORTS · 메이저의 공식 — 기록: 위키백과(CC BY-SA 4.0) · 생년월일: 위키데이터 · 사진: 위키미디어 공용(사진별 표기)</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <ScrollTop />
        <Header />
        <main className="min-h-[70vh]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/goat" element={<Goat />} />
            <Route path="/specialist" element={<Specialist />} />
            <Route path="/champion-dna" element={<ChampionDna />} />
            <Route path="/formula" element={<Formula />} />
            <Route path="/dna" element={<Dna />} />
            <Route path="/legends" element={<Legends />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/versus" element={<Versus />} />
            <Route path="/nations" element={<Nations />} />
            <Route path="/records" element={<Records />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/edition/:id" element={<EditionPage />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </HashRouter>
    </DataProvider>
  );
}
