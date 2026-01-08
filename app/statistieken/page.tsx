"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string | number;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

interface DartStat {
  id: string;
  game_id: string;
  player_id: string;
  three_dart_avg: number | null;
  first9_avg: number | null;
  finish: number | null;
  highest_finish: number | null;
  doubles_hit: number | null;
  doubles_thrown: number | null;
  checkout_percentage: number | null;
  double_percentage: number | null;
  highest_score: number | null;
  one_eighties: number | null;
  scores_140_plus: number | null;
  scores_100_plus: number | null;
  scores_80_plus: number | null;
  total_turns: number | null;
  total_darts: number | null;
  leg_darts: number[] | null;
  best_leg: number | null;
  worst_leg: number | null;
  legs_played: number | null;
  created_at: string;
}

interface AggregatedStats {
  threeDartAvg: number;
  first9Avg: number;
  top5Finishes: number[];
  bestLeg: number | null;
  total180s: number;
  total140Plus: number;
  total100Plus: number;
  total80Plus: number;
  totalFinishesAbove100: number;
}

export default function Statistieken() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    if (typeof window === "undefined") return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async (playerId: string | number) => {
    if (typeof window === "undefined") return;

    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from("dart_stats")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stats:", error);
        alert("Fout bij ophalen statistieken: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        setStats(null);
        return;
      }

      const finishRecords = data.filter((stat: DartStat) => stat.finish !== null && stat.finish >= 2 && stat.finish <= 170);

      // Aggregeer de statistieken
      const aggregated: AggregatedStats = {
        threeDartAvg: 0,
        first9Avg: 0,
        top5Finishes: [],
        bestLeg: null,
        total180s: 0,
        total140Plus: 0,
        total100Plus: 0,
        total80Plus: 0,
        totalFinishesAbove100: 0,
      };

      // Verzamel alle finishes voor top 5 (tel hoe vaak elke finish voorkomt)
      const finishCounts = new Map<number, number>();
      let totalThreeDartSum = 0;
      let totalThreeDartCount = 0;
      let totalFirst9Sum = 0;
      let totalFirst9Count = 0;
      const allBestLegs: number[] = [];

      data.forEach((stat: DartStat) => {
        // 3-dart gemiddelde (gewogen gemiddelde)
        if (stat.three_dart_avg !== null && stat.total_turns !== null && stat.total_turns > 0) {
          totalThreeDartSum += stat.three_dart_avg * stat.total_turns;
          totalThreeDartCount += stat.total_turns;
        }

        // First 9 gemiddelde (gewogen gemiddelde)
        if (stat.first9_avg !== null && stat.total_turns !== null && stat.total_turns > 0) {
          // Schat first9 turns (meestal eerste 3 turns = 9 darts)
          const first9Turns = Math.min(3, stat.total_turns);
          totalFirst9Sum += stat.first9_avg * first9Turns;
          totalFirst9Count += first9Turns;
        }

        // Finishes (alleen geldige finishes tussen 2-170)
        if (stat.finish !== null && stat.finish >= 2 && stat.finish <= 170) {
          // Tel hoe vaak elke finish voorkomt
          const currentCount = finishCounts.get(stat.finish) || 0;
          finishCounts.set(stat.finish, currentCount + 1);
          
          if (stat.finish > 100) {
            aggregated.totalFinishesAbove100++;
          }
        }

        // Best leg
        if (stat.best_leg !== null) {
          allBestLegs.push(stat.best_leg);
        }

        // Totaal aantal 180's
        if (stat.one_eighties !== null) {
          aggregated.total180s += stat.one_eighties;
        }

        // Totaal aantal scores
        if (stat.scores_140_plus !== null) {
          aggregated.total140Plus += stat.scores_140_plus;
        }
        if (stat.scores_100_plus !== null) {
          aggregated.total100Plus += stat.scores_100_plus;
        }
        if (stat.scores_80_plus !== null) {
          aggregated.total80Plus += stat.scores_80_plus;
        }
      });

      // Bereken gemiddelden
      if (totalThreeDartCount > 0) {
        aggregated.threeDartAvg = totalThreeDartSum / totalThreeDartCount;
      }
      if (totalFirst9Count > 0) {
        aggregated.first9Avg = totalFirst9Sum / totalFirst9Count;
      }

      // Top 5 finishes - toon unieke finishes gesorteerd op hoogte
      // Als een finish meerdere keren is uitgegooid, toon deze meerdere keren
      const allFinishes: number[] = [];
      finishCounts.forEach((count, finish) => {
        // Voeg de finish toe voor elke keer dat deze is uitgegooid
        for (let i = 0; i < count; i++) {
          allFinishes.push(finish);
        }
      });
      
      // Sorteer op hoogte (hoogste eerst) en neem top 5
      aggregated.top5Finishes = allFinishes
        .sort((a, b) => b - a)
        .slice(0, 5);

      // Beste leg (minste aantal darts)
      if (allBestLegs.length > 0) {
        aggregated.bestLeg = Math.min(...allBestLegs);
      }

      setStats(aggregated);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(false);
    fetchStats(profile.id);
  };

  const formatNumber = (num: number | null): string => {
    if (num === null || num === undefined) return "-";
    if (typeof num === "number" && isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const formatInteger = (num: number | null): string => {
    if (num === null || num === undefined) return "-";
    if (typeof num === "number" && isNaN(num)) return "-";
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A294F] to-[#1a3d6b] flex flex-col relative">
      {/* Terug pijltje linksboven */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <button className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-white rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation">
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

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6 pt-16">
        <div className="max-w-md mx-auto w-full">
          {/* Title */}
          <h1 className="text-white text-2xl font-semibold mb-6 text-center">
            Statistieken
          </h1>

          {/* Profile Selector - 2 vakken */}
          <div className="flex gap-3 mb-6">
            {/* Links: + knop */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="bg-[#28C7D8] text-white py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-150 hover:bg-[#22a8b7] touch-manipulation flex items-center justify-center"
              style={{ minHeight: "64px", width: "64px" }}
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Rechts: Geselecteerde speler */}
            <div
              className="flex-1 bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-3"
              style={{ minHeight: "64px" }}
            >
              {selectedProfile ? (
                <>
                  {selectedProfile.avatar_url ? (
                    <Image
                      src={selectedProfile.avatar_url}
                      alt={selectedProfile.username}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      style={{ width: "40px", height: "40px" }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-lg">
                      {selectedProfile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-lg">{selectedProfile.username}</span>
                </>
              ) : (
                <span className="text-[#7E838F] font-semibold text-lg">Geen profiel geselecteerd</span>
              )}
            </div>
          </div>

          {/* Statistics Table */}
          {isLoadingStats ? (
            <div className="text-white text-center py-8">
              Laden...
            </div>
          ) : selectedProfile && stats ? (
            <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-center gap-3 mb-4">
                {selectedProfile.avatar_url ? (
                  <Image
                    src={selectedProfile.avatar_url}
                    alt={selectedProfile.username}
                    width={60}
                    height={60}
                    className="rounded-full object-cover"
                    style={{ width: "60px", height: "60px" }}
                  />
                ) : (
                  <div className="w-15 h-15 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-2xl"
                    style={{ width: "60px", height: "60px" }}>
                    {selectedProfile.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-[#000000] font-semibold text-xl">
                  {selectedProfile.username}
                </h2>
              </div>
              <div className="space-y-4">
                {/* 3-dart gemiddelde */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">3-dart gemiddelde</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatNumber(stats.threeDartAvg)}
                  </span>
                </div>

                {/* First 9 gemiddelde */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">First 9 gemiddelde</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatNumber(stats.first9Avg)}
                  </span>
                </div>

                {/* Hoogste finishes */}
                <div className="py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold block mb-2">
                    Hoogste finishes (top 5)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {stats.top5Finishes.length > 0 ? (
                      <>
                        {stats.top5Finishes.map((finish, index) => (
                          <span
                            key={index}
                            className="bg-[#28C7D8] text-white px-3 py-1 rounded-lg font-semibold"
                            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                          >
                            {finish}
                          </span>
                        ))}
                        {/* Vul aan met streepjes als er minder dan 5 zijn */}
                        {Array.from({ length: 5 - stats.top5Finishes.length }).map((_, index) => (
                          <span
                            key={`dash-${index}`}
                            className="text-[#7E838F] px-3 py-1 rounded-lg font-semibold"
                          >
                            -
                          </span>
                        ))}
                      </>
                    ) : (
                      <>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span
                            key={`dash-${index}`}
                            className="text-[#7E838F] px-3 py-1 rounded-lg font-semibold"
                          >
                            -
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Beste leg */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">Beste leg</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {stats.bestLeg !== null ? `${stats.bestLeg} darts` : "-"}
                  </span>
                </div>

                {/* Totaal aantal 180's */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">Totaal aantal 180&apos;s</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatInteger(stats.total180s)}
                  </span>
                </div>

                {/* Totaal aantal 140+ scores */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">Totaal aantal 140+ scores</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatInteger(stats.total140Plus)}
                  </span>
                </div>

                {/* Totaal aantal 100+ scores */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">Totaal aantal 100+ scores</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatInteger(stats.total100Plus)}
                  </span>
                </div>

                {/* Totaal aantal 80+ scores */}
                <div className="flex justify-between items-center py-3 border-b border-[#D0E0FF]">
                  <span className="text-[#000000] font-semibold">Totaal aantal 80+ scores</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatInteger(stats.total80Plus)}
                  </span>
                </div>

                {/* Totaal aantal finishes boven de 100 */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-[#000000] font-semibold">Totaal aantal finishes boven de 100</span>
                  <span className="text-[#0A294F] font-bold text-lg">
                    {formatInteger(stats.totalFinishesAbove100)}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedProfile && !stats ? (
            <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-md text-center">
              <p className="text-[#000000] font-semibold text-lg">
                Geen statistieken gevonden voor {selectedProfile.username}
              </p>
              <p className="text-[#7E838F] text-sm mt-2">
                Speel eerst een game om statistieken te verzamelen
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Profile Selection Modal */}
      {isProfileModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-[#0A294F] bg-opacity-60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsProfileModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2 className="text-[#000000] font-semibold text-xl mb-2">
                  Selecteer een profiel
                </h2>
                <p className="text-[#7E838F] text-sm">
                  Kies een profiel om statistieken te bekijken
                </p>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-[#7E838F]">Laden...</p>
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#7E838F] mb-4">Geen profielen gevonden</p>
                  <Link href="/profielen">
                    <button className="bg-[#28C7D8] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#22a8b7]">
                      Maak een profiel aan
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleProfileSelect(profile)}
                      className="w-full bg-white text-[#000000] py-4 px-4 rounded-xl font-semibold text-lg hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 border-2 border-[#0A294F] text-left flex items-center gap-3"
                    >
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.username}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                          style={{ width: "32px", height: "32px" }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-sm">
                          {profile.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {profile.username}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-full mt-6 py-4 px-6 bg-[#0A294F] text-white rounded-xl font-semibold text-lg hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150"
              >
                Sluiten
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
