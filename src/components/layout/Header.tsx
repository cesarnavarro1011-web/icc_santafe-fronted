'use client';

import { useState, useEffect, useRef } from 'react';
import { useScrollSpy } from '@/lib/useScrollSpy';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // track URL hash to immediately highlight target section on click
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHash = () => setHash(window.location.hash.slice(1) || null);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const toggleMenu = () => setIsMenuOpen(o => !o);

  // Evitar scroll del body cuando menú móvil está abierto
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      prevFocusRef.current = document.activeElement as HTMLElement;
      // Focus first focusable inside menu
      requestAnimationFrame(() => {
        const first = mobileMenuRef.current?.querySelector<HTMLElement>('a, button');
        first?.focus();
      });
    } else {
      document.body.style.overflow = original || '';
      if (prevFocusRef.current) {
        prevFocusRef.current.focus();
      }
    }
    return () => { document.body.style.overflow = original || ''; };
  }, [isMenuOpen]);

  // Focus trap & ESC close
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = mobileMenuRef.current?.querySelectorAll<HTMLElement>('a, button');
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isMenuOpen]);

  const menuItems = [
    { href: '/', label: 'Inicio', spyId: undefined },
    { href: '/#eventos', label: 'Eventos', spyId: 'eventos' },
    { href: '/#predicaciones', label: 'Predicaciones', spyId: 'predicaciones' },
    { href: '/#ministerios', label: 'Ministerios', spyId: 'ministerios' },
    { href: '/#oracion', label: 'Oración', spyId: 'oracion' },
    { href: '/nosotros', label: 'Quiénes Somos', spyId: undefined },
    { href: '/contactanos', label: 'Contáctanos', spyId: undefined },
  ];

  const activeSpyId = useScrollSpy({ ids: ['eventos','predicaciones','ministerios'], offset: 0, minRatio: 0.1, threshold: [0,0.1,0.25,0.5,0.75,1], rootMargin: '0px 0px -45% 0px' });
  const HERO_SENTINEL = '__hero__';

  const baseHeaderClasses = 'fixed top-0 inset-x-0 z-50 transition-all duration-300 backdrop-saturate-150';
  const stateHeaderClasses = scrolled
    ? 'bg-[#0b0b0d]/90 backdrop-blur-md shadow-lg shadow-black/40 border-b border-white/10'
    // : 'bg-gradient-to-b from-[#1a0000]/90 via-[#000000FF]/40 to-transparent backdrop-blur-sm';
    : 'bg-black';

  return (
    <header className={`${baseHeaderClasses} ${stateHeaderClasses}`}>
      {/* Línea de acento superior */}
  <div className="h-0.5 w-full" />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center py-3 md:py-4 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <span className="relative flex items-center justify-center h-10 w-10">
              <Image
                src="/images/logo.jpg"
                alt="Logo"
                fill
                className="object-cover"
                priority
              />
            </span>
            <div className="leading-tight">
              <h1 className="text-base md:text-lg font-bold text-white tracking-tight">Iglesa Cuadrangular Santa Fe</h1>
              <p className="text-[10px] md:text-[11px] uppercase tracking-wide font-medium bg-gradient-to-r from-[#8000FFFF] via-[#0041F3FF]  via-[#FF0000FF] to-[#F4CB00FF]  bg-clip-text text-transparent">Creciendo en número y en conocimiento</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {(() => {
              return menuItems.map(item => {
                const isHash = item.href.startsWith('/#');
                let activeRoute = !isHash && pathname === item.href && item.href !== '/'; // única ruta base que no queremos usar para destacar Inicio
                // Inicio sólo activo si sentinel hero
                if (item.href === '/' && activeSpyId === HERO_SENTINEL) activeRoute = true;
                const spyActive = !!(item.spyId && activeSpyId === item.spyId);
                const hashActive = !!(item.spyId && hash === item.spyId);
                const active = activeRoute || spyActive || hashActive;
                const underlineActive = active; // subrayado sólo para el realmente activo
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative font-medium transition-colors duration-200 text-sm tracking-wide ${active ? 'text-white' : 'text-gray-300 hover:text-[#f5cc00]'} ${spyActive ? 'bg-gradient-to-r from-[#710000] via-[#5a189a] to-[#0E34A0] bg-clip-text text-transparent' : ''}`}
                  >
                    <span className="px-0.5 py-2 inline-block">{item.label}</span>
                    <span
                      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-[2px] w-0 rounded-full bg-gradient-to-r from-[#5a189a] via-[#0E34A0] via-[#710000] to-[#f5cc00] transition-all duration-300 ${underlineActive ? 'w-8' : 'group-hover:w-8'} `}
                    />
                  </Link>
                );
              });
            })()}
          </nav>

            {/* CTA Button Desktop */}
          <div className="hidden lg:block">
            <Link
              href="/login"
              className="relative inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold bg-[#FFFFFFFF] text-[#000000FF] shadow-md shadow-black/30 ring-1 ring-[#f5cc00]/30 hover:shadow-lg hover:shadow-black/50 hover:bg-[#f5cc00] hover:text-[#FFFFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0E34A0]/60 transition"
            >
              <span className="relative">Iniciar Sesión</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}  
          <button
            onClick={toggleMenu}
            aria-label="Abrir menú"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="lg:hidden p-2 rounded-md text-gray-200 hover:text-[#f5cc00] hover:bg-white/5 transition focus:outline-none focus:ring-2 focus:ring-[#f5cc00]/60"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        ref={mobileMenuRef}
        id="mobile-menu"
        className={`lg:hidden overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(.4,0,.2,1)] bg-[#0b0d0d]/95 backdrop-blur-xl border-t border-white/10 ${isMenuOpen ? 'opacity-100' : 'opacity-0'} `}
        style={{ height: isMenuOpen ? 'auto' as const : 0 }}
        aria-hidden={!isMenuOpen}
      >
        <nav className="px-6 py-6 flex flex-col gap-2" role="navigation" aria-label="Menú móvil">
          {(() => {
            return menuItems.map((item, index) => {
              const isHash = item.href.startsWith('/#');
              let activeRoute = !isHash && pathname === item.href && item.href !== '/';
              if (item.href === '/' && activeSpyId === HERO_SENTINEL) activeRoute = true;
              const spyActive = !!(item.spyId && activeSpyId === item.spyId);
              const hashActive = !!(item.spyId && hash === item.spyId);
              const active = activeRoute || spyActive || hashActive;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-md px-4 py-2.5 text-sm font-medium transition flex items-center justify-between opacity-0 translate-y-2 animate-mobile-menu-item ${active ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-[#f5cc00] hover:bg-white/5'} ${spyActive ? 'ring-1 ring-white/10 bg-gradient-to-r from-[#710000]/70 via-[#5a189a]/70 to-[#0E34A0]/70 text-white shadow-md shadow-black/30' : ''}`}
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  {item.label}
                  {active && <span className="ml-3 h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />}
                </Link>
              );
            });
          })()}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="mt-4 relative inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold bg-[#f5cc00] text-[#0b0b0d] shadow-md shadow-black/30 ring-1 ring-[#f5cc00]/30 hover:shadow-lg hover:shadow-black/50 hover:bg-white hover:text-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#0E34A0]/60 transition opacity-0 translate-y-2 animate-mobile-menu-item"
            style={{ animationDelay: `${menuItems.length * 55}ms` }}
          >
            Iniciar Sesión
          </Link>
        </nav>
      </div>
    </header>
  );
}
