"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface MenuItem {
  text: string;
  subtext: string;
  icon: string;
}

interface HamburgerMenuProps {
  items: MenuItem[];
}

export default function HamburgerMenu({ items }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Mapping van gekleurde iconen naar witte iconen
  const getWhiteIcon = (iconPath: string): string => {
    const iconMap: { [key: string]: string } = {
      "/dart board.png": "/tdesign_dart-board-filled.png",
      "/beer.png": "/ri_beer-fill.png",
      "/stats.png": "/ion_stats-chart.png",
      "/achievements.png": "/mdi_achievement-variant.png",
      "/tv.png": "/ri_tv-line.png",
    };
    return iconMap[iconPath] || iconPath;
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-[#E8F0FF] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform duration-200 hover:bg-[#D0E0FF] touch-manipulation"
        aria-label="Menu"
      >
        <div className="w-6 h-6 flex flex-col justify-center gap-1.5">
          <span
            className={`block h-0.5 w-6 bg-[#000000] transition-all duration-300 ${
              isOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-[#000000] transition-all duration-300 ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-[#000000] transition-all duration-300 ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0A294F] bg-opacity-50 z-30 transition-opacity duration-300 pointer-events-auto"
          onClick={toggleMenu}
        />
      )}

      {/* Menu Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#E8F0FF] z-40 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-20 pb-6 px-4 overflow-y-auto">
          <div className="space-y-3">
            {items.map((item, index) => {
              const MenuContent = (
                <>
                  <Image
                    src={getWhiteIcon(item.icon)}
                    alt={item.text}
                    width={44}
                    height={44}
                    className="shrink-0"
                  />
                  <div className="flex flex-col items-start justify-center gap-0.5">
                    <span className="text-left font-semibold text-lg leading-tight">
                      {item.text}
                    </span>
                    <span className="text-left text-xs leading-tight" style={{ color: "#7E838F" }}>
                      {item.subtext}
                    </span>
                  </div>
                </>
              );

              // Link voor "Speel 501"
              if (item.text === "Speel 501") {
                return (
                  <Link
                    key={index}
                    href="/speel-501"
                    onClick={toggleMenu}
                    className="w-full bg-[#0A294F] text-white py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-transform duration-150 hover:bg-[#0d3a6a] touch-manipulation flex items-center gap-3"
                    style={{
                      minHeight: "64px",
                    }}
                  >
                    {MenuContent}
                  </Link>
                );
              }

              // Normale button voor andere items
              return (
                <button
                  key={index}
                  onClick={toggleMenu}
                  className="w-full bg-[#0A294F] text-white py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-transform duration-150 hover:bg-[#0d3a6a] touch-manipulation flex items-center gap-3"
                  style={{
                    minHeight: "64px",
                  }}
                >
                  {MenuContent}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

