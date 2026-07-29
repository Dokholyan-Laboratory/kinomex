"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/tree", label: "Kinome Tree" },
  { href: "/explorer", label: "Explorer" },
  { href: "/search", label: "AI Search" },
  { href: "/docs", label: "Docs" },
];

export default function Navigation() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleNavSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && searchValue.trim()) {
        router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
        setSearchValue("");
      }
    },
    [router, searchValue]
  );

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex-shrink-0" onClick={closeMobile}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="kinomex-bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="x-cyan" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                  <linearGradient id="x-violet" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#e879f9" />
                  </linearGradient>
                </defs>
                {/* Kinome tree outer ring */}
                <circle cx="32" cy="32" r="27" stroke="url(#kinomex-bg)" strokeWidth="1.5" opacity="0.5" fill="none" />
                <circle cx="32" cy="32" r="23" stroke="url(#kinomex-bg)" strokeWidth="0.5" opacity="0.3" strokeDasharray="2.5 4" fill="none" />
                {/* Tree branch arcs - 8 kinase groups */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  const x1 = 32 + 23 * Math.cos(rad);
                  const y1 = 32 + 23 * Math.sin(rad);
                  const x2 = 32 + 28 * Math.cos(rad);
                  const y2 = 32 + 28 * Math.sin(rad);
                  return (
                    <g key={angle}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#kinomex-bg)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                      <circle cx={x2} cy={y2} r="1.5" fill="url(#kinomex-bg)" opacity="0.4" />
                    </g>
                  );
                })}
                {/* X mark */}
                <path d="M16 16L48 48" stroke="url(#x-cyan)" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M48 16L16 48" stroke="url(#x-violet)" strokeWidth="5.5" strokeLinecap="round" />
                {/* Glassmorphism PDB card at center */}
                <g>
                  {/* Glass background */}
                  <rect x="20" y="20" width="24" height="24" rx="6" fill="white" opacity="0.08" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
                  {/* Glass highlight */}
                  <rect x="20" y="20" width="24" height="10" rx="6" fill="white" opacity="0.06" />
                  {/* Glass shadow */}
                  <rect x="20" y="20" width="24" height="24" rx="6" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  {/* PDB ribbon - beta sheet arrows */}
                  <path d="M24 27L28 27L28 29L24.5 29" stroke="white" strokeWidth="1.3" fill="none" opacity="0.8" strokeLinejoin="round" />
                  <path d="M24 32L29 32L29 34L24.5 34" stroke="white" strokeWidth="1.3" fill="none" opacity="0.6" strokeLinejoin="round" />
                  {/* PDB ribbon - alpha helix coil */}
                  <path d="M33 26Q36 26 35 29Q34 32 37 32" stroke="white" strokeWidth="1.3" fill="none" opacity="0.8" />
                  <path d="M33 35Q36 35 35 38Q34 41 37 41" stroke="white" strokeWidth="1.3" fill="none" opacity="0.6" />
                  {/* PDB ribbon - connecting loop */}
                  <path d="M29 28Q31 25 33 26" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5" />
                  <path d="M29 33Q31 30 33 35" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
                </g>
              </svg>
            </Link>
            <div className="flex flex-col leading-none">
              <Link href="/" onClick={closeMobile}>
                <span className="text-xl font-bold text-gradient-cyan-violet">
                  KinomeX
                </span>
              </Link>
              <a
                href="https://dokhlab.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-slate-400 hover:text-kinome-cyan transition-colors duration-200"
              >
                Dokholyan Laboratory
              </a>
            </div>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleNavSearch}
                placeholder="Quick search..."
                className="w-56 pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 focus:ring-1 focus:ring-kinome-cyan/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={toggleMobile}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-slate-900/80 backdrop-blur-md"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="block px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleNavSearch}
                    placeholder="Quick search..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 focus:ring-1 focus:ring-kinome-cyan/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
