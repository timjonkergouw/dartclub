"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Speel501Borrelmodus() {
  const [firstToBestOf, setFirstToBestOf] = useState<"first-to" | "best-of">("first-to");
  const [setsLegs, setSetsLegs] = useState<"sets" | "legs">("sets");
  const [counter, setCounter] = useState(1);
  const [name, setName] = useState("");
  const [profiles, setProfiles] = useState<{ id: number; username: string; avatar_url?: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"select" | "create">("select");
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: number; username: string; avatar_url?: string | null }[]>([]);
  const [playerDifficulties, setPlayerDifficulties] = useState<Map<number, "easy" | "medium" | "hard" | "extreme">>(new Map());
  const [sipMultiplier, setSipMultiplier] = useState(1);

  const incrementCounter = () => {
    setCounter(counter + 1);
  };

  const decrementCounter = () => {
    if (counter > 1) {
      setCounter(counter - 1);
    }
  };

  const createProfile = async () => {
    if (!name.trim()) {
      alert("Voer een naam in");
      return;
    }
    setIsLoading(true);
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase environment variables missing:", {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        });
        alert("Database configuratie ontbreekt. Controleer of de environment variables correct zijn ingesteld.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.from("profiles").insert({ username: name.trim() }).select();

      if (error) {
        console.error("Supabase error:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        let errorMessage = error.message || "Onbekende fout";

        // Provide more helpful error messages
        if (error.code === "PGRST301" || error.message?.includes("permission denied")) {
          errorMessage = "Geen toestemming om profiel aan te maken. Controleer de database policies.";
        } else if (error.message?.includes("duplicate key") || error.code === "23505") {
          errorMessage = "Deze gebruikersnaam bestaat al. Kies een andere naam.";
        } else if (error.message?.includes("violates row-level security")) {
          errorMessage = "Row Level Security policy blokkeert deze actie. Controleer de Supabase policies.";
        }

        alert(`Fout bij aanmaken profiel: ${errorMessage}`);
        throw error;
      }

      if (data && data[0]) {
        setSelectedPlayers([...selectedPlayers, data[0]]);
        setName("");
        fetchProfiles();
        setModalMode("select");
        setIsModalOpen(false);
      } else {
        alert("Profiel aangemaakt maar geen data ontvangen. Probeer opnieuw.");
      }
    } catch (error: unknown) {
      console.error("Error creating profile:", error);

      let errorMessage = "Onbekende fout";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Handle network/fetch errors specifically
        if (error.message === "Failed to fetch" || error.name === "TypeError") {
          errorMessage = "Kan geen verbinding maken met de database. Controleer:\n" +
            "1. Of je internetverbinding werkt\n" +
            "2. Of de Supabase URL correct is ingesteld\n" +
            "3. Of CORS correct is geconfigureerd in Supabase\n" +
            "4. Of de database online is";

          console.error("Network error detected. Check:", {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          });
        }
      } else if (typeof error === "object" && error !== null) {
        const err = error as { error_description?: string; message?: string };
        errorMessage = err.error_description || err.message || "Onbekende fout";
      }

      alert(`Er is een fout opgetreden bij het aanmaken van het profiel:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPlayer = (player: { id: number; username: string; avatar_url?: string | null }) => {
    if (!selectedPlayers.find((p) => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
      // Set default difficulty to "medium" for new player
      setPlayerDifficulties(prev => new Map(prev).set(player.id, "medium"));
    }
    setModalMode("select");
  };

  const removePlayer = (playerId: number) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
    // Remove difficulty when player is removed
    setPlayerDifficulties(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  };

  const fetchProfiles = async () => {
    // Only execute on client side
    if (typeof window === "undefined") return;

    try {
      const { data, error } = await supabase.from("profiles").select("*").order("username", { ascending: true });
      if (error) {
        console.error("Error fetching profiles:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        // Don't show alert for fetch errors, just log them
        return;
      }
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      if (error instanceof Error && error.message === "Failed to fetch") {
        console.error("Network error when fetching profiles. Check Supabase configuration.");
      }
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

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
            onClick={() => {
              setIsModalOpen(false);
              setModalMode("select");
              setName("");
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#000000] font-semibold text-xl">
                  {modalMode === "create" ? "Nieuwe speler" : "Kies speler"}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalMode("select");
                    setName("");
                  }}
                  className="w-8 h-8 rounded-full bg-[#0A294F] text-[#E8F0FF] flex items-center justify-center hover:bg-[#0d3a6a] active:scale-95 transition-all"
                >
                  ×
                </button>
              </div>

              {modalMode === "select" ? (
                <>
                  {/* Keuze buttons */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => setModalMode("create")}
                      className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold text-sm hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 border-2 border-[#0A294F]"
                    >
                      Nieuwe speler
                    </button>
                    <button
                      onClick={() => setModalMode("select")}
                      className="flex-1 py-3 px-4 bg-[#0A294F] text-[#E8F0FF] rounded-xl font-semibold text-sm hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150"
                    >
                      Bestaande speler
                    </button>
                  </div>

                  {/* Lijst van bestaande spelers */}
                  {profiles.length > 0 ? (
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
                          {profile.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt={profile.username}
                              width={48}
                              height={48}
                              className="rounded-full object-cover shrink-0"
                              style={{ width: "48px", height: "48px" }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#0A294F] flex items-center justify-center text-[#E8F0FF] font-bold text-lg shrink-0">
                              {profile.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[#000000] font-medium text-sm">
                            {profile.username}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-[#7E838F] text-sm py-8">
                      Geen spelers beschikbaar. Maak eerst een nieuwe speler aan.
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Create mode */}
                  <div className="space-y-4">
                    <div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Naam"
                        className="w-full px-4 py-3 rounded-xl bg-white text-[#000000] placeholder-[#7E838F] border-2 border-transparent focus:border-[#0A294F] focus:outline-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            createProfile();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setModalMode("select");
                          setName("");
                        }}
                        className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold text-sm hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 border-2 border-[#0A294F]"
                      >
                        Annuleren
                      </button>
                      <button
                        onClick={createProfile}
                        disabled={isLoading || !name.trim()}
                        className="flex-1 py-3 px-4 bg-[#0A294F] text-[#E8F0FF] rounded-xl font-semibold text-sm hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "..." : "Aanmaken"}
                      </button>
                    </div>
                  </div>
                </>
              )}
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

      {/* Borrelinstellingen */}
      <div className="w-full max-w-md mx-auto mt-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
        <div className="bg-[#E8F0FF] rounded-2xl p-4 shadow-md transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Image
              src="/beer.png"
              alt="Borrelinstellingen"
              width={24}
              height={24}
              className="object-contain"
            />
            <div className="text-[#000000] font-black text-base uppercase tracking-wide">
              BORRELINSTELLINGEN
            </div>
          </div>

          {selectedPlayers.length === 0 ? (
            <div className="text-sm text-[#7E838F]">
              Selecteer eerst minimaal één speler om borrelinstellingen te kiezen.
            </div>
          ) : (
            <div className="space-y-4">
              {selectedPlayers.map((player) => (
                <div key={player.id} className="bg-[#0A294F] rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {player.avatar_url ? (
                      <Image
                        src={player.avatar_url}
                        alt={player.username}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        style={{ width: "40px", height: "40px" }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E8F0FF] flex items-center justify-center text-[#0A294F] font-bold text-lg">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[#E8F0FF] font-semibold text-base">
                      {player.username}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["easy", "medium", "hard", "extreme"] as const).map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={() => {
                          setPlayerDifficulties(prev => new Map(prev).set(player.id, difficulty));
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${playerDifficulties.get(player.id) === difficulty
                          ? "bg-[#28C7D8] text-white"
                          : "bg-[#E8F0FF] text-[#000000]"
                          }`}
                      >
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slokken multiply */}
          <div className="mt-4 pt-4 border-t border-[#0A294F] border-opacity-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#000000] font-semibold text-base">
                  Slokken multiply
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSipMultiplier(prev => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-[#0A294F] text-[#E8F0FF] rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
                  aria-label="Verlaag slokken multiplier"
                >
                  <span className="text-lg leading-none">−</span>
                </button>
                <div className="min-w-[40px] text-center text-xl font-bold text-[#000000]">
                  {sipMultiplier}x
                </div>
                <button
                  onClick={() => setSipMultiplier(prev => prev + 1)}
                  className="w-9 h-9 flex items-center justify-center bg-[#0A294F] text-[#E8F0FF] rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
                  aria-label="Verhoog slokken multiplier"
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Game Button - Onderaan */}
      <div className="w-full max-w-md mx-auto mt-auto mb-4 animate-scale-in" style={{ animationDelay: "0.4s", opacity: 0 }}>
        {selectedPlayers.length >= 2 ? (
          <Link
            href={`/play501borrelgame?players=${encodeURIComponent(
              JSON.stringify(selectedPlayers)
            )}&mode=${firstToBestOf}&type=${setsLegs}&target=${counter}&trackDoubles=false&difficulties=${encodeURIComponent(
              JSON.stringify(Object.fromEntries(playerDifficulties))
            )}&sipMultiplier=${sipMultiplier}`}
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
