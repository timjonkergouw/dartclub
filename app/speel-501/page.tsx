"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DEMO_PLAYERS, type Profile } from "@/lib/players";

export default function Speel501() {
  const [firstToBestOf, setFirstToBestOf] = useState<"first-to" | "best-of">("first-to");
  const [setsLegs, setSetsLegs] = useState<"sets" | "legs">("sets");
  const [counter, setCounter] = useState(1);
  const [startScore, setStartScore] = useState<301 | 501 | 701>(501);
  const profiles = DEMO_PLAYERS;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Profile[]>(DEMO_PLAYERS);

  const incrementCounter = () => {
    setCounter(counter + 1);
  };

  const decrementCounter = () => {
    if (counter > 1) {
      setCounter(counter - 1);
    }
  };

  const selectPlayer = (player: Profile) => {
    if (!selectedPlayers.find((p) => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const removePlayer = (playerId: number) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
  };

  return (
    <div className="min-h-screen flex flex-col items-start pt-4 pb-6 px-4 relative z-50">
      {/* Terug pijltje linksboven */}
      <div className="absolute top-4 left-4 z-50 animate-slide-in-left">
        <Link href="/">
          <button className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-white rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-300 hover:scale-110 touch-manipulation">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Link>
      </div>

      {/* Logo rechtsboven */}
      <div className="absolute top-4 right-4 z-50 animate-slide-in-right">
        <Link href="/">
          <Image
            src="/logo wit dartclub.png"
            alt="DartClub Logo"
            width={60}
            height={60}
            className="object-contain transition-transform duration-300 hover:scale-110"
          />
        </Link>
      </div>

      {/* Profiel vakje - midden boven */}
      <div className="w-full max-w-md mx-auto mt-16 mb-6 animate-fade-in-up">
        <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Image
              src="/players.png"
              alt="Spelers"
              width={24}
              height={24}
              className="object-contain"
            />
            <div className="text-[#000000] font-semibold text-lg">
              Spelers
            </div>
          </div>

          {/* Geselecteerde spelers */}
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            {selectedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center gap-1 relative"
              >
                <div className="relative">
                  {player.avatar_url ? (
                    <Image
                      src={player.avatar_url}
                      alt={player.username}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                      style={{ width: "64px", height: "64px" }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#0A294F] flex items-center justify-center text-[#E8F0FF] font-bold text-xl">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 active:scale-95 transition-all"
                  >
                    ×
                  </button>
                </div>
                <span className="text-xs text-[#000000] font-medium text-center max-w-[80px] truncate">
                  {player.username}
                </span>
              </div>
            ))}

            {/* Plus knop */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-16 h-16 rounded-full bg-[#0A294F] flex items-center justify-center text-[#E8F0FF] hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modal/Popup */}
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-[#0A294F] bg-opacity-40 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#000000] font-semibold text-xl">Kies speler</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#0A294F] text-[#E8F0FF] flex items-center justify-center hover:bg-[#0d3a6a] active:scale-95 transition-all"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      selectPlayer(profile);
                      setIsModalOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#0A294F] flex items-center justify-center text-[#E8F0FF] font-bold text-lg shrink-0">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[#000000] font-medium text-sm">
                      {profile.username}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabbeltjes - Geïntegreerd blok */}
      <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <div className="bg-[#E8F0FF] rounded-2xl p-3 shadow-md transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Image
              src="/setting.png"
              alt="Spelinstellingen"
              width={24}
              height={24}
              className="object-contain"
            />
            <div className="text-[#000000] font-black text-base uppercase tracking-wide">
              SPELINSTELLINGEN
            </div>
          </div>

          {/* Start Score knoppen */}
          <div className="mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setStartScore(301)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${startScore === 301
                  ? "bg-[#0A294F] text-[#E8F0FF]"
                  : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                  }`}
              >
                301
              </button>
              <button
                onClick={() => setStartScore(501)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${startScore === 501
                  ? "bg-[#0A294F] text-[#E8F0FF]"
                  : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                  }`}
              >
                501
              </button>
              <button
                onClick={() => setStartScore(701)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${startScore === 701
                  ? "bg-[#0A294F] text-[#E8F0FF]"
                  : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                  }`}
              >
                701
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Links: First to / Best of */}
            <div className="flex-1">
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setFirstToBestOf("first-to")}
                  className={`w-full py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${firstToBestOf === "first-to"
                    ? "bg-[#0A294F] text-[#E8F0FF]"
                    : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                    }`}
                >
                  First to
                </button>
                <button
                  onClick={() => setFirstToBestOf("best-of")}
                  className={`w-full py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${firstToBestOf === "best-of"
                    ? "bg-[#0A294F] text-[#E8F0FF]"
                    : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                    }`}
                >
                  Best of
                </button>
              </div>
            </div>

            {/* Midden: Teller met pijltjes */}
            <div className="bg-[#28C7D8] rounded-full px-3 py-2">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={incrementCounter}
                  className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-[#E8F0FF] rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
                  aria-label="Verhoog teller"
                  style={{
                    minHeight: "40px",
                    minWidth: "40px",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 5V15M5 10H15"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="text-3xl font-bold text-white min-w-10 text-center py-0.5">
                  {counter}
                </div>
                <button
                  onClick={decrementCounter}
                  className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-[#E8F0FF] rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={counter <= 1}
                  aria-label="Verlaag teller"
                  style={{
                    minHeight: "40px",
                    minWidth: "40px",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 10H15"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Rechts: Sets / Legs */}
            <div className="flex-1">
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setSetsLegs("sets")}
                  className={`w-full py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${setsLegs === "sets"
                    ? "bg-[#0A294F] text-[#E8F0FF]"
                    : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                    }`}
                >
                  Sets
                </button>
                <button
                  onClick={() => setSetsLegs("legs")}
                  className={`w-full py-2.5 px-3 rounded-lg text-base font-semibold transition-all duration-200 ${setsLegs === "legs"
                    ? "bg-[#0A294F] text-[#E8F0FF]"
                    : "bg-transparent text-[#000000] hover:bg-[#28C7D8]"
                    }`}
                >
                  Legs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Game Button - Onderaan */}
      <div className="w-full max-w-md mx-auto mt-auto mb-4 animate-scale-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
        {selectedPlayers.length >= 2 ? (
          <Link
            href={`/play501game?players=${encodeURIComponent(
              JSON.stringify(selectedPlayers)
            )}&mode=${firstToBestOf}&type=${setsLegs}&target=${counter}&trackDoubles=false&startScore=${startScore}`}
            className="block w-full bg-[#28C7D8] text-white py-4 px-6 rounded-2xl shadow-md font-semibold text-lg text-center hover:bg-[#22a8b7] active:scale-95 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl touch-manipulation"
          >
            Start Game
          </Link>
        ) : (
          <button
            disabled
            className="block w-full bg-[#28C7D8] text-white py-4 px-6 rounded-2xl shadow-md font-semibold text-lg text-center opacity-50 cursor-not-allowed transition-all duration-300"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}

