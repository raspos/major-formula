import { useEffect, useState, type MouseEvent } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { DataProvider } from "./data";
import { CATEGORIES } from "./categories";
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

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// 이전 카테고리 URL은 목록 페이지 없이 해당 대표 분석으로 이동시킨다.
function LegacyCategoryRedirect() {
  const { slug } = useParams();
  const destination: Record<string, string> = {
    players: "/specialist",
    formula: "/formula",
    history: "/archive",
    legends: "/goat",
  };
  return <Navigate to={destination[slug ?? ""] ?? "/"} replace />;
}

function Header() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const closeDropdown = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.closest("details")?.removeAttribute("open");
  };
  return (
    <header className="sticky top-0 z-30 border-b border-gold/30 bg-green-deep text-ivory">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex shrink-0 items-baseline gap-2" onClick={closeMenu}>
          <span className="font-serif text-lg font-bold">메이저의 공식</span>
          <span className="hidden text-[11px] tracking-[0.25em] text-gold-light sm:inline">THE MAJOR FORMULA</span>
        </NavLink>
        <button className="rounded border border-ivory/30 px-3 py-1 text-sm xl:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="분석 메뉴">
          메뉴
        </button>
        <nav aria-label="주요 분석" className="hidden items-center gap-5 xl:flex">
          {CATEGORIES.map((category) => (
            <details key={category.slug} className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 whitespace-nowrap py-2 text-sm text-ivory/90 hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold [&::-webkit-details-marker]:hidden">
                {category.title}
                <span className="text-xs text-gold-light transition group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="absolute left-0 top-full z-40 w-56 pt-2">
                <div className="rounded-lg border border-gold/25 bg-green-deep p-2 shadow-xl">
                  {category.items.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={closeDropdown} className="block rounded px-3 py-2 text-sm text-ivory/90 hover:bg-white/10 hover:text-gold-light">
                      {item.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            </details>
          ))}
          <NavLink to="/about" className="whitespace-nowrap text-sm text-ivory/90 hover:text-gold-light">데이터·방법</NavLink>
          <a href="https://raspos.github.io/databrew/" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap border-l border-ivory/25 pl-4 text-sm font-medium text-gold-light hover:text-white">
            databrew ↗
          </a>
        </nav>
      </div>
      {open && (
        <nav aria-label="모바일 분석" className="max-h-[75vh] space-y-1 overflow-y-auto border-t border-ivory/10 px-4 pb-3 xl:hidden">
          {CATEGORIES.map((category) => (
            <details key={category.slug} className="border-b border-ivory/10">
              <summary className="cursor-pointer py-3 text-sm font-medium text-ivory">{category.title}</summary>
              <div className="grid grid-cols-1 gap-1 pb-2 pl-3 sm:grid-cols-2">
                {category.items.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={closeMenu} className="rounded py-2 text-sm text-ivory/80 hover:text-gold-light">
                    {item.title} →
                  </NavLink>
                ))}
              </div>
            </details>
          ))}
          <NavLink to="/about" onClick={closeMenu} className="block py-3 text-sm text-ivory/90">데이터·방법</NavLink>
          <a href="https://raspos.github.io/databrew/" target="_blank" rel="noopener noreferrer" onClick={closeMenu} className="block py-3 text-sm font-medium text-gold-light">databrew ↗</a>
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
        <div className="mt-3 flex flex-wrap gap-5">
          <a href="https://raspos.github.io/databrew/" target="_blank" rel="noopener noreferrer" className="font-medium text-green-deep underline underline-offset-2">← databrew 프로젝트 허브</a>
          <NavLink to="/about" className="underline underline-offset-2">데이터 출처와 분석 방법</NavLink>
        </div>
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
            <Route path="/category/:slug" element={<LegacyCategoryRedirect />} />
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
