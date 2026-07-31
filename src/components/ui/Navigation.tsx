"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
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
              <Image
                src="/icons/kinomex-ribbon.png"
                alt="KinomeX"
                width={40}
                height={40}
                priority
                className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]"
              />
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
