"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  createInitialStats,
  registerTurn,
  calculateFinalStats,
  type DartStats,
} from "@/lib/dartlogic";
import { supabase } from "@/lib/supabase";

interface Player {
  id: number;
  username: string;
}

interface PlayerGameState {
  player: Player;
  score: number;
  totalScore: number;
  totalDarts: number;
  lastScore: number;
  turns: number;
  legsWon: number;
  setsWon: number;
}

export default function Play501Game() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [inputScore, setInputScore] = useState("");
  const [gameStates, setGameStates] = useState<PlayerGameState[]>([]);
  const [gameMode, setGameMode] = useState<"first-to" | "best-of">("first-to");
  const [gameType, setGameType] = useState<"sets" | "legs">("legs");
  const [target, setTarget] = useState(1);
  const [playerStats, setPlayerStats] = useState<Map<number, DartStats>>(new Map());
  const [gameId, setGameId] = useState<string>("");

  useEffect(() => {
    const playersParam = searchParams.get("players");
    const modeParam = searchParams.get("mode");
    const typeParam = searchParams.get("type");
    const targetParam = searchParams.get("target");

    if (playersParam) {
      try {
        const parsedPlayers = JSON.parse(playersParam);
        setPlayers(parsedPlayers);
        setGameMode((modeParam as "first-to" | "best-of") || "first-to");
        setGameType((typeParam as "sets" | "legs") || "legs");
        setTarget(parseInt(targetParam || "1"));

        // Initialize game states
        const initialStates: PlayerGameState[] = parsedPlayers.map(
          (player: Player) => ({
            player,
            score: 501,
            totalScore: 0,
            totalDarts: 0,
            lastScore: 0,
            turns: 0,
            legsWon: 0,
            setsWon: 0,
          })
        );
        setGameStates(initialStates);

        // Initialize stats for each player
        const initialStats = new Map<number, DartStats>();
        parsedPlayers.forEach((player: Player) => {
          initialStats.set(player.id, createInitialStats());
        });
        setPlayerStats(initialStats);

        // Generate unique game ID
        setGameId(`game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      } catch (error) {
        console.error("Error parsing players:", error);
        router.push("/speel-501");
      }
    } else {
      router.push("/speel-501");
    }
  }, [searchParams, router]);

  const handleNumberClick = (num: number) => {
    if (inputScore.length < 3) {
      setInputScore(inputScore + num.toString());
    }
  };

  const handleBackspace = () => {
    setInputScore(inputScore.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!inputScore || inputScore === "0") return;

    const score = parseInt(inputScore);
    if (score < 0 || score > 180) {
      alert("Score moet tussen 0 en 180 zijn");
      return;
    }

    const currentState = gameStates[currentPlayerIndex];
    const newScore = currentState.score - score;

    if (newScore < 0) {
      alert("Bust! Score te hoog");
      setInputScore("");
      return;
    }

    const updatedStates = [...gameStates];

    // Register turn in stats
    const currentPlayerId = currentState.player.id;
    const currentPlayerStat = playerStats.get(currentPlayerId) || createInitialStats();
    const updatedStat = registerTurn(currentPlayerStat, score);
    const updatedStats = new Map(playerStats);
    updatedStats.set(currentPlayerId, updatedStat);
    setPlayerStats(updatedStats);

    if (newScore === 0) {
      // Leg gewonnen
      updatedStates[currentPlayerIndex] = {
        ...currentState,
        score: 501, // Reset voor volgende leg
        totalScore: currentState.totalScore + score,
        totalDarts: currentState.totalDarts + 3,
        lastScore: score,
        turns: currentState.turns + 1,
        legsWon: currentState.legsWon + 1,
      };

      // Reset alle spelers' scores voor nieuwe leg
      updatedStates.forEach((state, idx) => {
        if (idx !== currentPlayerIndex) {
          state.score = 501;
        }
      });

      // Check if set is won (if playing sets)
      if (gameType === "sets") {
        const legsNeeded = Math.ceil(target / 2);
        if (updatedStates[currentPlayerIndex].legsWon >= legsNeeded) {
          updatedStates[currentPlayerIndex].setsWon += 1;
          updatedStates[currentPlayerIndex].legsWon = 0;
          // Reset all players' legs for new set
          updatedStates.forEach((state) => {
            state.legsWon = 0;
          });
        }
      }

      // Check if game is won
      const gameWon = gameType === "legs"
        ? updatedStates[currentPlayerIndex].legsWon >= target
        : updatedStates[currentPlayerIndex].setsWon >= target;

      if (gameWon) {
        // Game finished - save stats for all players
        finishGame(updatedStates, updatedStats);
      }
    } else {
      updatedStates[currentPlayerIndex] = {
        ...currentState,
        score: newScore,
        totalScore: currentState.totalScore + score,
        totalDarts: currentState.totalDarts + 3,
        lastScore: score,
        turns: currentState.turns + 1,
      };
    }

    setGameStates(updatedStates);
    setInputScore("");
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const finishGame = async (
    finalStates: PlayerGameState[],
    finalStats: Map<number, DartStats>
  ) => {
    try {
      // Save stats for each player
      const statsPromises = finalStates.map(async (state) => {
        const playerStat = finalStats.get(state.player.id);
        if (!playerStat) return;

        const finalStatsData = calculateFinalStats(playerStat, state.lastScore);

        await supabase.from("dart_stats").insert({
          game_id: gameId,
          player_id: state.player.id,
          ...finalStatsData,
        });
      });

      await Promise.all(statsPromises);
      console.log("Game stats opgeslagen!");
    } catch (error) {
      console.error("Error saving game stats:", error);
    }
  };

  const handleUndoTurn = () => {
    // Reset de beurt - ga terug naar vorige speler en reset input
    if (currentPlayerIndex > 0) {
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    } else {
      setCurrentPlayerIndex(players.length - 1);
    }
    setInputScore("");
  };

  const handleMenu = () => {
    router.push("/speel-501");
  };

  const calculateAverage = (state: PlayerGameState): number => {
    if (state.turns === 0) return 0;
    return Math.round((state.totalScore / state.totalDarts) * 3 * 100) / 100;
  };

  if (players.length === 0 || gameStates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#000000]">Laden...</div>
      </div>
    );
  }

  const isTwoPlayers = players.length === 2;
  const currentState = gameStates[currentPlayerIndex];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A294F] pt-4 pb-6 px-4">
      {/* Header met scorebord en logo */}
      <div className="mb-4 relative">
        <div className="flex justify-between items-start">
          {/* Scorebord linksboven */}
          <div>
            <div className="text-white font-semibold text-lg">
              {gameMode === "first-to" ? "First to" : "Best of"} {target} {gameType}
            </div>
          </div>

          {/* Logo rechtsboven */}
          <div>
            <Image
              src="/logo wit dartclub.png"
              alt="DartClub Logo"
              width={50}
              height={50}
              className="object-contain"
            />
          </div>
        </div>


        {/* Spelers display */}
        {isTwoPlayers ? (
          <div className="flex mb-6 rounded-2xl overflow-hidden relative">
            {/* Speler 1 - Links */}
            <div className="flex-1 p-4 transition-all duration-200 relative bg-[#28C7D8]">
              <div className="text-center relative z-10">
                <div className="font-semibold text-lg mb-2 text-white">
                  {gameStates[0].player.username}
                </div>
                <div className="text-5xl font-bold mb-2 text-white">
                  {gameStates[0].score}
                </div>
                <div className="rounded-lg px-3 py-1 mb-2 inline-block bg-[#EEEEEE]">
                  <div className="text-sm font-bold text-[#000000]">
                    Legs: {gameStates[0].legsWon}
                  </div>
                  {gameType === "sets" && (
                    <div className="text-sm font-bold text-[#000000]">
                      Sets: {gameStates[0].setsWon}
                    </div>
                  )}
                </div>
                <div className="text-xs space-y-1 text-white/80">
                  <div>3-dart avg: {calculateAverage(gameStates[0])}</div>
                  <div>Darts: {gameStates[0].totalDarts}</div>
                  <div>Laatst: {gameStates[0].lastScore}</div>
                </div>
              </div>
            </div>

            {/* Speler 2 - Rechts */}
            <div className="flex-1 p-4 transition-all duration-200 relative bg-[#EEEEEE]">
              <div className="text-center relative z-10">
                <div className="font-semibold text-lg mb-2 text-[#000000]">
                  {gameStates[1].player.username}
                </div>
                <div className="text-5xl font-bold mb-2 text-[#000000]">
                  {gameStates[1].score}
                </div>
                <div className="rounded-lg px-3 py-1 mb-2 inline-block bg-[#28C7D8]">
                  <div className="text-sm font-bold text-white">
                    Legs: {gameStates[1].legsWon}
                  </div>
                  {gameType === "sets" && (
                    <div className="text-sm font-bold text-white">
                      Sets: {gameStates[1].setsWon}
                    </div>
                  )}
                </div>
                <div className="text-xs space-y-1 text-[#7E838F]">
                  <div>3-dart avg: {calculateAverage(gameStates[1])}</div>
                  <div>Darts: {gameStates[1].totalDarts}</div>
                  <div>Laatst: {gameStates[1].lastScore}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 space-y-2">
            {gameStates.map((state, index) => (
              <div
                key={state.player.id}
                className={`rounded-xl p-3 flex items-center justify-between transition-all duration-200 relative ${index % 2 === 0 ? "bg-[#28C7D8]" : "bg-[#EEEEEE]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`font-semibold text-base ${index % 2 === 0 ? "text-white" : "text-[#000000]"
                      }`}
                  >
                    {state.player.username}
                  </div>
                  <div
                    className={`text-xs ${index % 2 === 0 ? "text-white/80" : "text-[#7E838F]"
                      }`}
                  >
                    3-dart avg: {calculateAverage(state)}
                  </div>
                  <div
                    className={`rounded px-2 py-0.5 ${index % 2 === 0 ? "bg-[#EEEEEE]" : "bg-[#28C7D8]"
                      }`}
                  >
                    <div
                      className={`text-xs font-bold ${index % 2 === 0 ? "text-[#000000]" : "text-white"
                        }`}
                    >
                      Legs: {state.legsWon}
                    </div>
                    {gameType === "sets" && (
                      <div
                        className={`text-xs font-bold ${index % 2 === 0 ? "text-[#000000]" : "text-white"
                          }`}
                      >
                        Sets: {state.setsWon}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold ${index % 2 === 0 ? "text-white" : "text-[#000000]"
                    }`}
                >
                  {state.score}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wie is aan de beurt - onder het scorebord */}
        <div className="text-white text-xl font-semibold mt-2">
          {gameStates[currentPlayerIndex].player.username} is aan de beurt
        </div>
      </div>


      {/* Huidige invoer balkje */}
      <div className="mb-6 w-full">
        <div className="bg-[#EEEEEE] rounded-lg px-6 py-4 w-full">
          <span className="text-5xl font-bold text-[#000000] text-left block">
            {inputScore || "0"}
          </span>
        </div>
      </div>

      {/* Numpad */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto w-full">
          {/* Rij 1: 1, 2, 3, backspace */}
          <button
            onClick={() => handleNumberClick(1)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            1
          </button>
          <button
            onClick={() => handleNumberClick(2)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            2
          </button>
          <button
            onClick={() => handleNumberClick(3)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            3
          </button>
          <button
            onClick={handleBackspace}
            className="bg-[#0A294F] text-white text-2xl font-semibold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation flex items-center justify-center"
            style={{ minHeight: "64px" }}
          >
            <Image
              src="/lucide_delete.png"
              alt="Backspace"
              width={24}
              height={24}
              className="object-contain"
            />
          </button>

          {/* Rij 2: 4, 5, 6, check (bovenste deel) */}
          <button
            onClick={() => handleNumberClick(4)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            4
          </button>
          <button
            onClick={() => handleNumberClick(5)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            5
          </button>
          <button
            onClick={() => handleNumberClick(6)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            6
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#28C7D8] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation row-span-2 flex items-center justify-center"
            style={{ minHeight: "136px" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Rij 3: 7, 8, 9, check (onderste deel) */}
          <button
            onClick={() => handleNumberClick(7)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            7
          </button>
          <button
            onClick={() => handleNumberClick(8)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            8
          </button>
          <button
            onClick={() => handleNumberClick(9)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            9
          </button>

          {/* Rij 4: beurt terug (curved arrow), 0, menu */}
          <button
            onClick={handleUndoTurn}
            className="bg-[#0A294F] text-white text-lg font-semibold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation flex items-center justify-center"
            style={{ minHeight: "64px" }}
          >
            <Image
              src="/icon-park-twotone_back.png"
              alt="Beurt terug"
              width={24}
              height={24}
              className="object-contain"
            />
          </button>
          <button
            onClick={() => handleNumberClick(0)}
            className="bg-[#0A294F] text-white text-2xl font-bold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            0
          </button>
          <button
            onClick={handleMenu}
            className="bg-[#0A294F] text-white text-lg font-semibold py-4 rounded-lg border-2 border-white hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ minHeight: "64px" }}
          >
            Menu
          </button>
        </div>
      </div>
    </div >
  );
}
