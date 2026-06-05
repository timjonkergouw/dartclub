"use client";

import Image from "next/image";
import Link from "next/link";
import { DEMO_PLAYERS } from "@/lib/players";

export default function Profielen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A294F] to-[#1a3d6b] flex flex-col relative">
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <button className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-white rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-50">
        <Link href="/">
          <Image
            src="/logo wit dartclub.png"
            alt="DartClub Logo"
            width={60}
            height={60}
            className="object-contain"
          />
        </Link>
      </div>

      <div className="flex-1 px-4 pb-6 pt-16">
        <div className="max-w-md mx-auto w-full">
          <h1 className="text-white text-2xl font-semibold mb-2 text-center">
            Profielen
          </h1>
          <p className="text-[#7E838F] text-sm text-center mb-6">
            Demo spelers — altijd beschikbaar
          </p>

          <div className="space-y-3">
            {DEMO_PLAYERS.map((profile) => (
              <div
                key={profile.id}
                className="bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md flex items-center gap-3"
                style={{ minHeight: "64px" }}
              >
                <div className="w-12 h-12 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-lg">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-lg">{profile.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
