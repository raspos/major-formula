import { useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { DataProvider } from "./data";
import { CATEGORIES } from "./categories";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
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

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const links = [
    ...CATEGORIES.map((c) => ({ to: "/category/" + c.slug, label: c.title })),
    { to: "/about", label: "데이터·방법" },
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-gold/30 bg-green-deep text-ivory">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-serif text-lg font-bold">메이저의 공식</span>
          <span className="hidden text-[11px] tracking-[0.25em] text-gold-light sm:inline">THE MAJOR FORMULA</span>
        </NavLink>
        <button className="rounded border border-ivory/30 px-3 py-1 text-sm md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="카테고리 메뉴">
          메뉴
        </button>
        <nav aria-label="주요 카테고리" className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => "text-sm " + (isActive ? "font-medium text-gold-light" : "text-ivory/85 hover:text-white")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {open && (
        <nav aria-label="모바일 카테고리" className="grid grid-cols-2 gap-1 border-t border-ivory/10 px-4 pb-3 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-3 text-sm text-ivory/90">
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-charcoal/10 bg-ivory-dark/60">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-charcoal-soft sm:px-6">
        <p>databrew SPORTS · 메이저의 공식 — 기록: 위키백과(CC BY-SA 4.0) · 생년월일: 위키데이터 · 사진: 위키미디어 공용(사진별 표기)</p>
        <NavLink to="/about" className="mt-2 inline-block underline underline-offset-2">데이터 출처와 분석 방법</NavLink>
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
            <Route path="/category/:slug" element={<CategoryPage />} />
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
