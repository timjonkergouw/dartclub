"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  createInitialStats,
  registerTurn,
  registerDoubleAttempt,
  calculateFinalStats,
  type DartStats,
} from "@/lib/dartlogic";
import { supabase } from "@/lib/supabase";
import { calculateCheckoutInfo } from "@/lib/checkout";

interface Player {
  id: number;
  username: string;
  avatar_url?: string | null;
}

interface PlayerGameState {
  player: Player;
  score: number;
  totalScore: number;
  totalDarts: number;
  dartsInCurrentLeg: number;
  lastScore: number;
  turns: number;
  legsWon: number;
  setsWon: number;
}

function Play501GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [inputScore, setInputScore] = useState("");
  const [gameStates, setGameStates] = useState<PlayerGameState[]>([]);
  const [gameMode, setGameMode] = useState<"first-to" | "best-of">("first-to");
  const [gameType, setGameType] = useState<"sets" | "legs">("legs");
  const [target, setTarget] = useState(1);
  const [startScore, setStartScore] = useState(501);
  const [playerStats, setPlayerStats] = useState<Map<number, DartStats>>(new Map());
  const [showBustPopup, setShowBustPopup] = useState(false);
  const [showInvalidScorePopup, setShowInvalidScorePopup] = useState(false);
  const [legStartingPlayerIndex, setLegStartingPlayerIndex] = useState(0);
  const [setStartingPlayerIndex, setSetStartingPlayerIndex] = useState(0);
  const [showGameFinished, setShowGameFinished] = useState(false);
  const [winner, setWinner] = useState<PlayerGameState | null>(null);
  const [trackDoubles, setTrackDoubles] = useState(false);
  const [showDoublePopup, setShowDoublePopup] = useState(false);
  const [doubleDarts, setDoubleDarts] = useState<number | null>(null);
  const [pendingDoubleCheckout, setPendingDoubleCheckout] = useState<{
    score: number;
    currentState: PlayerGameState;
    updatedStates: PlayerGameState[];
    updatedStats: Map<number, DartStats>;
    possibleDartsOnDouble: number[];
    isCheckout?: boolean; // True als dit een finish is (newScore === 0), false als het een mogelijke finish is
  } | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<{
    gameStates: PlayerGameState[];
    playerStats: Map<number, DartStats>;
    currentPlayerIndex: number;
    legStartingPlayerIndex: number;
    setStartingPlayerIndex: number;
  }>>([]);
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [startMethod, setStartMethod] = useState<"bulls" | "wheel" | "coin" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Player[]>([]);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [currentWheelRotation, setCurrentWheelRotation] = useState(0); // For live updates during spinning
  const [currentWheelPlayer, setCurrentWheelPlayer] = useState<Player | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [showPermissionInstructions, setShowPermissionInstructions] = useState(false);
  const [shakeDetectionReady, setShakeDetectionReady] = useState(false);
  const [showStartingPlayerPopup, setShowStartingPlayerPopup] = useState(false);
  const [startingPlayer, setStartingPlayer] = useState<Player | null>(null);
  const [hasShaken, setHasShaken] = useState(false);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupShownRef = useRef(false);

  useEffect(() => {
    if (!searchParams) return;
    if (typeof window === "undefined") return;

    const playersParam = searchParams.get("players");
    const modeParam = searchParams.get("mode");
    const typeParam = searchParams.get("type");
    const targetParam = searchParams.get("target");
    const trackDoublesParam = searchParams.get("trackDoubles");
    const startScoreParam = searchParams.get("startScore");

    if (playersParam) {
      try {
        const parsedPlayers = JSON.parse(playersParam);
        if (!Array.isArray(parsedPlayers) || parsedPlayers.length === 0) {
          if (typeof window !== "undefined") {
            router.push("/speel-501");
          }
          return;
        }

        setPlayers(parsedPlayers);
        setGameMode((modeParam as "first-to" | "best-of") || "first-to");
        setGameType((typeParam as "sets" | "legs") || "legs");
        setTarget(parseInt(targetParam || "1", 10) || 1);
        setTrackDoubles(trackDoublesParam === "true");
        const parsedStartScore = parseInt(startScoreParam || "501", 10);
        setStartScore(parsedStartScore === 301 || parsedStartScore === 501 || parsedStartScore === 701 ? parsedStartScore : 501);

        // Initialize game states
        const initialStates: PlayerGameState[] = parsedPlayers.map(
          (player: Player) => ({
            player,
            score: parsedStartScore === 301 || parsedStartScore === 501 || parsedStartScore === 701 ? parsedStartScore : 501,
            totalScore: 0,
            totalDarts: 0,
            dartsInCurrentLeg: 0,
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

        // Reset finishGame ref en lock voor nieuwe game
        finishGameRef.current = null;
        finishGameLockRef.current = false;
        finishGameTriggeredRef.current = false;

        // Initialize starting players
        setLegStartingPlayerIndex(0);
        setSetStartingPlayerIndex(0);
        setCurrentPlayerIndex(0);

        // Show start popup
        setShowStartPopup(true);
      } catch (error) {
        console.error("Error parsing players:", error);
        if (typeof window !== "undefined") {
          router.push("/speel-501");
        }
      }
    } else {
      if (typeof window !== "undefined") {
        router.push("/speel-501");
      }
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

  const confirmDoubleCheckout = useCallback(() => {
    if (!pendingDoubleCheckout || doubleDarts === null) return;

    const { score, currentState, updatedStates, updatedStats, isCheckout } = pendingDoubleCheckout;

    // Als dit een finish is (isCheckout === true), gebruik de checkout logica
    if (isCheckout) {
      // Sla huidige state op in geschiedenis
      const currentStateCopy = gameStates.map(state => ({ ...state }));
      const currentStatsCopy = new Map<number, DartStats>();
      playerStats.forEach((stats, playerId) => {
        currentStatsCopy.set(playerId, { ...stats });
      });
      setGameHistory(prev => [...prev, {
        gameStates: currentStateCopy,
        playerStats: currentStatsCopy,
        currentPlayerIndex,
        legStartingPlayerIndex,
        setStartingPlayerIndex,
      }]);

      const updatedStatesCopy = [...updatedStates];
      const updatedStatsCopy = new Map(updatedStats);

      // Update stats met dubbel tracking
      const currentPlayerId = currentState.player.id;
      const currentPlayerStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();

      // Bij uitgooien: doublesHit = 1 (de laatste pijl op dubbel), doublesThrown = doubleDarts
      const updatedStat = registerDoubleAttempt(currentPlayerStat, doubleDarts, 1);
      updatedStatsCopy.set(currentPlayerId, updatedStat);

      // Track leg darts en hoogste finish
      const legDarts = currentState.dartsInCurrentLeg + doubleDarts;
      updatedStat.legDarts = [...updatedStat.legDarts, legDarts];
      if (score > updatedStat.highestFinish) {
        updatedStat.highestFinish = score;
      }
      updatedStatsCopy.set(currentPlayerId, updatedStat);

      // Leg gewonnen - verhoog legsWon voor de winnende speler
      // totalDarts is al bijgewerkt tijdens normale beurten, voeg alleen checkout darts toe
      const newLegsWon = currentState.legsWon + 1;
      updatedStatesCopy[currentPlayerIndex] = {
        ...currentState,
        score: startScore, // Reset voor volgende leg
        totalScore: currentState.totalScore + score,
        totalDarts: currentState.totalDarts + doubleDarts, // Voeg alleen checkout darts toe (dartsInCurrentLeg zit al in totalDarts)
        dartsInCurrentLeg: 0, // Reset darts voor nieuwe leg
        lastScore: score,
        turns: 0, // Reset turns voor nieuwe leg
        legsWon: newLegsWon,
      };

      // Reset alle spelers' scores en darts voor nieuwe leg
      // totalDarts is al correct bijgewerkt tijdens beurten, behoud het
      updatedStatesCopy.forEach((state, idx) => {
        if (idx !== currentPlayerIndex) {
          state.score = startScore;
          // totalDarts blijft zoals het is (al correct bijgewerkt)
          state.dartsInCurrentLeg = 0; // Reset alleen darts voor nieuwe leg
          state.turns = 0;
        }
      });

      // Wissel startende speler voor de volgende leg
      const newLegStartingPlayerIndex = (legStartingPlayerIndex + 1) % players.length;
      setLegStartingPlayerIndex(newLegStartingPlayerIndex);

      let setWon = false;
      let newSetStartingPlayerIndex = setStartingPlayerIndex;
      let gameWon = false;

      // Als gameType === "sets", dan werken we met sets (3 legs per set)
      if (gameType === "sets") {
        const legsNeededForSet = 3;

        if (newLegsWon >= legsNeededForSet) {
          updatedStatesCopy[currentPlayerIndex].setsWon += 1;
          setWon = true;
          updatedStatesCopy.forEach((state) => {
            state.legsWon = 0;
          });
          newSetStartingPlayerIndex = (setStartingPlayerIndex + 1) % players.length;
          setSetStartingPlayerIndex(newSetStartingPlayerIndex);
        }

        if (gameMode === "first-to") {
          gameWon = updatedStatesCopy[currentPlayerIndex].setsWon >= target;
        } else {
          const majority = Math.floor(target / 2) + 1;
          gameWon = updatedStatesCopy[currentPlayerIndex].setsWon >= majority;
        }
      } else {
        if (gameMode === "first-to") {
          gameWon = newLegsWon >= target;
        } else {
          const majority = Math.floor(target / 2) + 1;
          gameWon = newLegsWon >= majority;
        }
      }

      if (gameWon) {
        setWinner(updatedStatesCopy[currentPlayerIndex]);
        setShowGameFinished(true);
        // finishGame wordt aangeroepen in confirmCheckout, maar hier moeten we het ook aanroepen
        // We kunnen het niet direct aanroepen omdat het later wordt gedeclareerd
        // Laat het via useEffect gebeuren of roep het aan na de declaratie
      } else if (setWon) {
        setCurrentPlayerIndex(newSetStartingPlayerIndex);
      } else {
        setCurrentPlayerIndex(newLegStartingPlayerIndex);
      }

      setGameStates(updatedStatesCopy);
      setPlayerStats(updatedStatsCopy);
      setShowDoublePopup(false);
      setPendingDoubleCheckout(null);
      setDoubleDarts(null);
      setInputScore("");
      return;
    }

    // Normale double checkout (mogelijke finish maar niet uitgegooid)
    // Sla huidige state op in geschiedenis
    const currentStateCopy = gameStates.map(state => ({ ...state }));
    const currentStatsCopy = new Map<number, DartStats>();
    playerStats.forEach((stats, playerId) => {
      currentStatsCopy.set(playerId, { ...stats });
    });
    setGameHistory(prev => [...prev, {
      gameStates: currentStateCopy,
      playerStats: currentStatsCopy,
      currentPlayerIndex,
      legStartingPlayerIndex,
      setStartingPlayerIndex,
    }]);

    const updatedStatesCopy = [...updatedStates];
    const updatedStatsCopy = new Map(updatedStats);

    // Update stats met dubbel tracking
    const currentPlayerId = currentState.player.id;
    const currentPlayerStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();

    // doublesHit = 0 (niet uitgegooid), doublesThrown = aantal pijlen op dubbel
    const updatedStat = registerDoubleAttempt(currentPlayerStat, doubleDarts, 0);
    updatedStatsCopy.set(currentPlayerId, updatedStat);

    // Update game state
    updatedStatesCopy[currentPlayerIndex] = {
      ...currentState,
      score: currentState.score - score,
      totalScore: currentState.totalScore + score,
      totalDarts: currentState.totalDarts + 3,
      dartsInCurrentLeg: currentState.dartsInCurrentLeg + 3,
      lastScore: score,
      turns: currentState.turns + 1,
    };

    setGameStates(updatedStatesCopy);
    setPlayerStats(updatedStatsCopy);
    setShowDoublePopup(false);
    setPendingDoubleCheckout(null);
    setDoubleDarts(null);
    setInputScore("");
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  }, [pendingDoubleCheckout, doubleDarts, currentPlayerIndex, players.length, gameStates, playerStats, legStartingPlayerIndex, setStartingPlayerIndex, gameType, gameMode, target]);

  const handleBust = useCallback(() => {
    // Sla huidige state op in geschiedenis
    const currentStateCopy = gameStates.map(state => ({ ...state }));
    const currentStatsCopy = new Map<number, DartStats>();
    playerStats.forEach((stats, playerId) => {
      currentStatsCopy.set(playerId, { ...stats });
    });
    setGameHistory(prev => [...prev, {
      gameStates: currentStateCopy,
      playerStats: currentStatsCopy,
      currentPlayerIndex,
      legStartingPlayerIndex,
      setStartingPlayerIndex,
    }]);

    // Score blijft hetzelfde, beurt gaat naar volgende speler
    setShowBustPopup(true);
    setInputScore("");
  }, [gameStates, playerStats, currentPlayerIndex, legStartingPlayerIndex, setStartingPlayerIndex]);

  const confirmBust = () => {
    // Beurt naar volgende speler, score blijft hetzelfde
    setShowBustPopup(false);
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  // Helper functie om checkout direct uit te voeren (zonder popup)
  const executeCheckout = useCallback((score: number, currentState: PlayerGameState, updatedStates: PlayerGameState[], updatedStats: Map<number, DartStats>, checkoutDarts: number = 3) => {
    const updatedStatesCopy = [...updatedStates];
    const updatedStatsCopy = new Map(updatedStats);

    // Update stats met dubbel tracking als trackDoubles aan staat
    const currentPlayerId = currentState.player.id;
    const currentPlayerStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();

    if (trackDoubles) {
      // Bij uitgooien: doublesHit = 1 (de laatste pijl op dubbel), doublesThrown = checkoutDarts
      // Maar we moeten alleen de laatste pijl tellen als hit, de rest als thrown
      const updatedStat = registerDoubleAttempt(currentPlayerStat, checkoutDarts, 1);
      updatedStatsCopy.set(currentPlayerId, updatedStat);
    }

    // Track leg darts en hoogste finish
    const updatedStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();
    const legDarts = currentState.dartsInCurrentLeg + checkoutDarts;
    updatedStat.legDarts = [...updatedStat.legDarts, legDarts];
    if (score > updatedStat.highestFinish) {
      updatedStat.highestFinish = score;
    }
    updatedStatsCopy.set(currentPlayerId, updatedStat);

    // Leg gewonnen - verhoog legsWon voor de winnende speler
    // totalDarts is al bijgewerkt tijdens normale beurten, voeg alleen checkout darts toe
    const newLegsWon = currentState.legsWon + 1;
    updatedStatesCopy[currentPlayerIndex] = {
      ...currentState,
      score: startScore, // Reset voor volgende leg
      totalScore: currentState.totalScore + score,
      totalDarts: currentState.totalDarts + checkoutDarts, // Voeg alleen checkout darts toe (dartsInCurrentLeg zit al in totalDarts)
      dartsInCurrentLeg: 0, // Reset darts voor nieuwe leg
      lastScore: score,
      turns: 0, // Reset turns voor nieuwe leg
      legsWon: newLegsWon,
    };

    // Reset alle spelers' scores en darts voor nieuwe leg
    // totalDarts is al correct bijgewerkt tijdens beurten, behoud het
    updatedStatesCopy.forEach((state, idx) => {
      if (idx !== currentPlayerIndex) {
        state.score = startScore;
        // totalDarts blijft zoals het is (al correct bijgewerkt)
        state.dartsInCurrentLeg = 0; // Reset alleen darts voor nieuwe leg
        state.turns = 0; // Reset turns voor nieuwe leg
      }
    });

    // Wissel startende speler voor de volgende leg
    const newLegStartingPlayerIndex = (legStartingPlayerIndex + 1) % players.length;
    setLegStartingPlayerIndex(newLegStartingPlayerIndex);

    let setWon = false;
    let newSetStartingPlayerIndex = setStartingPlayerIndex;
    let gameWon = false;

    // Als gameType === "sets", dan werken we met sets (3 legs per set)
    if (gameType === "sets") {
      const legsNeededForSet = 3;

      // Check of deze speler de set gewonnen heeft (3 legs in de huidige set)
      if (newLegsWon >= legsNeededForSet) {
        // Set gewonnen!
        updatedStatesCopy[currentPlayerIndex].setsWon += 1;
        setWon = true;

        // Reset alle legs naar 0 voor nieuwe set
        updatedStatesCopy.forEach((state) => {
          state.legsWon = 0;
        });

        // Wissel startende speler voor de volgende set
        newSetStartingPlayerIndex = (setStartingPlayerIndex + 1) % players.length;
        setSetStartingPlayerIndex(newSetStartingPlayerIndex);
      }

      // Check if game is won op basis van sets
      if (gameMode === "first-to") {
        // First to X: eerste speler die X sets wint
        gameWon = updatedStatesCopy[currentPlayerIndex].setsWon >= target;
      } else {
        // Best of X: meerderheid nodig (bijv. best of 5 = 3 sets nodig)
        const majority = Math.floor(target / 2) + 1;
        gameWon = updatedStatesCopy[currentPlayerIndex].setsWon >= majority;
      }
    } else {
      // gameType === "legs": direct op legs winnen, geen sets
      if (gameMode === "first-to") {
        // First to X: eerste speler die X legs wint
        gameWon = newLegsWon >= target;
      } else {
        // Best of X: meerderheid nodig (bijv. best of 5 = 3 legs nodig)
        const majority = Math.floor(target / 2) + 1;
        gameWon = newLegsWon >= majority;
      }
    }

    if (gameWon) {
      // Game finished - save stats and show end screen
      setWinner(updatedStatesCopy[currentPlayerIndex]);
      setShowGameFinished(true);
      // finishGame wordt aangeroepen via useEffect om dubbele aanroep te voorkomen
    } else if (setWon) {
      // Nieuwe set begint - start met de nieuwe set starting player
      setCurrentPlayerIndex(newSetStartingPlayerIndex);
    } else {
      // Nieuwe leg begint - start met de nieuwe leg starting player
      setCurrentPlayerIndex(newLegStartingPlayerIndex);
    }

    setGameStates(updatedStatesCopy);
    setPlayerStats(updatedStatsCopy);
    setInputScore("");
  }, [currentPlayerIndex, legStartingPlayerIndex, setStartingPlayerIndex, gameType, gameMode, target, trackDoubles, players.length]);

  const handleSubmit = useCallback(() => {
    // Als inputScore leeg is, gebruik 0
    const scoreToUse = !inputScore || inputScore === "" ? 0 : parseInt(inputScore);
    if (scoreToUse === 0 && inputScore !== "0" && inputScore !== "") return;

    const score = scoreToUse;

    // Check voor scores boven 180 (niet mogelijk)
    if (score > 180) {
      setShowInvalidScorePopup(true);
      setInputScore("");
      return;
    }

    if (score < 0) {
      setShowInvalidScorePopup(true);
      setInputScore("");
      return;
    }

    // Check voor onmogelijke scores (scores die niet met 3 pijlen kunnen worden gegooid)
    const impossibleScores = [179, 178, 176, 175, 173, 172, 169, 168, 166, 165, 163, 162, 159];
    if (impossibleScores.includes(score)) {
      setShowInvalidScorePopup(true);
      setInputScore("");
      return;
    }

    const currentState = gameStates[currentPlayerIndex];
    if (!currentState) return;

    const newScore = currentState.score - score;

    if (newScore < 0) {
      // Bust: score te hoog
      handleBust();
      return;
    }

    // Check of je op 1 uitkomt (kan niet finishen, geen dubbel 1/2)
    if (newScore === 1) {
      // Bust: kan niet finishen vanaf 1
      handleBust();
      return;
    }

    // Check of je kunt finishen (alleen vanaf 170 of lager)
    if (newScore === 0 && currentState.score > 170) {
      // Bust: kan niet finishen vanaf 171+
      handleBust();
      return;
    }

    // Sla huidige state op in geschiedenis voordat we wijzigen
    const currentStateCopy = gameStates.map(state => ({ ...state }));
    const currentStatsCopy = new Map<number, DartStats>();
    playerStats.forEach((stats, playerId) => {
      currentStatsCopy.set(playerId, { ...stats });
    });
    setGameHistory(prev => [...prev, {
      gameStates: currentStateCopy,
      playerStats: currentStatsCopy,
      currentPlayerIndex,
      legStartingPlayerIndex,
      setStartingPlayerIndex,
    }]);

    const updatedStates = [...gameStates];

    // Register turn in stats
    const currentPlayerId = currentState.player.id;
    const currentPlayerStat = playerStats.get(currentPlayerId) || createInitialStats();
    const updatedStat = registerTurn(currentPlayerStat, score);
    const updatedStats = new Map(playerStats);
    updatedStats.set(currentPlayerId, updatedStat);
    setPlayerStats(updatedStats);

    if (newScore === 0) {
      // Uitgegooid - check of we dubbel tracking moeten doen op basis van finish score
      if (trackDoubles) {
        // Bepaal mogelijke darts op dubbel op basis van finish score die speler HAD (voordat hij de finish gooide)
        const finishScore = currentState.score; // De score die de speler had voordat hij de finish gooide

        // Finishes waarbij automatisch 1 pijl op dubbel wordt aangenomen (eerst checken voor prioriteit)
        const finishesAuto1 = [99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 160, 161, 164, 167, 170];

        // Finishes waarbij je 1, 2 en 3 kunt kiezen
        const finishesWith123 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

        // Finishes waarbij je 1 en 2 kunt kiezen
        const finishesWith12 = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 100, 101, 104, 107];

        let possibleDartsOnDouble: number[] = [];

        if (finishesAuto1.includes(finishScore)) {
          // Automatisch doorgaan met 1 pijl op dubbel - direct checkout uitvoeren
          executeCheckout(score, currentState, updatedStates, updatedStats, 1);
          return;
        } else if (finishesWith123.includes(finishScore)) {
          possibleDartsOnDouble = [1, 2, 3];
        } else if (finishesWith12.includes(finishScore)) {
          possibleDartsOnDouble = [1, 2];
        } else {
          // Fallback: automatisch 3 pijlen aannemen
          executeCheckout(score, currentState, updatedStates, updatedStats, 3);
          return;
        }

        // Toon double checkout popup met aangepaste opties (dit is een finish, newScore === 0)
        setPendingDoubleCheckout({
          score,
          currentState,
          updatedStates,
          updatedStats,
          possibleDartsOnDouble: possibleDartsOnDouble,
          isCheckout: true, // Dit is een finish
        });
        setShowDoublePopup(true);
        setDoubleDarts(null);
        setInputScore("");
        return;
      }

      // Normale checkout (zonder dubbel tracking) - automatisch 3 pijlen
      executeCheckout(score, currentState, updatedStates, updatedStats, 3);
      return;
    } else {
      // Check of dit een mogelijke finish was (maar niet uitgegooid)
      if (trackDoubles) {
        const checkoutInfo = calculateCheckoutInfo(newScore);
        if (checkoutInfo.isPossible && checkoutInfo.possibleDartsOnDouble.length > 0) {
          // Bepaal mogelijke darts op dubbel op basis van finish score die speler HAD (voordat hij de finish gooide)
          // Dit is de score die overblijft na de beurt (newScore), wat de mogelijke finish is
          const finishScore = newScore;

          // Finishes waarbij automatisch 1 pijl op dubbel wordt aangenomen (eerst checken voor prioriteit)
          const finishesAuto1 = [99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 160, 161, 164, 167, 170];

          // Finishes waarbij je 1, 2 en 3 kunt kiezen
          const finishesWith123 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];

          // Finishes waarbij je 1 en 2 kunt kiezen
          const finishesWith12 = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 100, 101, 104, 107];

          let possibleDartsOnDouble: number[] = [];

          if (finishesAuto1.includes(finishScore)) {
            // Automatisch doorgaan met 1 pijl op dubbel
            const currentPlayerId = currentState.player.id;
            const currentPlayerStat = updatedStats.get(currentPlayerId) || createInitialStats();
            const updatedStat = registerDoubleAttempt(currentPlayerStat, 1, 0);
            updatedStats.set(currentPlayerId, updatedStat);
            setPlayerStats(updatedStats);
            setGameStates(updatedStates);
            setInputScore("");
            setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
            return;
          } else if (finishesWith123.includes(finishScore)) {
            possibleDartsOnDouble = [1, 2, 3];
          } else if (finishesWith12.includes(finishScore)) {
            possibleDartsOnDouble = [1, 2];
          } else {
            // Fallback naar originele logica
            possibleDartsOnDouble = checkoutInfo.possibleDartsOnDouble;
          }

          // Mogelijke finish - toon pop-up voor dubbel tracking
          setPendingDoubleCheckout({
            score,
            currentState,
            updatedStates,
            updatedStats,
            possibleDartsOnDouble: possibleDartsOnDouble,
          });
          setShowDoublePopup(true);
          setDoubleDarts(null);
          setInputScore("");
          return;
        }
      }

      updatedStates[currentPlayerIndex] = {
        ...currentState,
        score: newScore,
        totalScore: currentState.totalScore + score,
        totalDarts: currentState.totalDarts + 3, // Darts in huidige leg (wordt gereset bij nieuwe leg)
        dartsInCurrentLeg: currentState.dartsInCurrentLeg + 3, // Darts in huidige leg
        lastScore: score,
        turns: currentState.turns + 1,
      };
      setGameStates(updatedStates);
      setInputScore("");
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }
  }, [inputScore, gameStates, currentPlayerIndex, playerStats, players.length, legStartingPlayerIndex, setStartingPlayerIndex, trackDoubles, handleBust, executeCheckout]);

  // Keyboard event listener voor numpad en toetsenbord
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle double checkout popup keyboard input
      if (showDoublePopup && pendingDoubleCheckout) {
        // Numpad toetsen (1-3) of normale cijfer toetsen voor double popup
        let num: number | null = null;
        if (event.key >= "1" && event.key <= "3") {
          num = parseInt(event.key);
        } else if (event.code.startsWith("Numpad") && (event.code === "Numpad1" || event.code === "Numpad2" || event.code === "Numpad3")) {
          const numpadMatch = event.code.match(/Numpad(\d)/);
          if (numpadMatch) {
            num = parseInt(numpadMatch[1]);
          }
        }

        if (num !== null && !isNaN(num)) {
          // Check of dit nummer een mogelijke optie is
          if (pendingDoubleCheckout.possibleDartsOnDouble.includes(num)) {
            setDoubleDarts(num);
            event.preventDefault();
          }
        }
        // Enter voor bevestigen
        else if (event.key === "Enter") {
          event.preventDefault();
          if (doubleDarts !== null) {
            confirmDoubleCheckout();
          }
        }
        return;
      }

      // Negeer keyboard input als game finished screen open is
      if (showGameFinished || showBustPopup || showInvalidScorePopup) {
        return;
      }

      // Numpad toetsen (0-9) of normale cijfer toetsen
      let num: number | null = null;
      if (event.key >= "0" && event.key <= "9") {
        num = parseInt(event.key);
      } else if (event.code.startsWith("Numpad")) {
        // Numpad toetsen: Numpad0 t/m Numpad9
        const numpadMatch = event.code.match(/Numpad(\d)/);
        if (numpadMatch) {
          num = parseInt(numpadMatch[1]);
        }
      }

      if (num !== null && !isNaN(num)) {
        setInputScore((prev) => {
          if (prev.length < 3) {
            return prev + num.toString();
          }
          return prev;
        });
        event.preventDefault();
      }
      // Backspace of Delete
      else if (event.key === "Backspace" || event.key === "Delete") {
        setInputScore((prev) => prev.slice(0, -1));
        event.preventDefault();
      }
      // Enter voor submit
      else if (event.key === "Enter") {
        event.preventDefault();
        // Roep handleSubmit direct aan - als er geen score is, gebruik 0
        if (!showGameFinished && !showBustPopup && !showInvalidScorePopup) {
          if (!inputScore || inputScore === "0") {
            setInputScore("0");
            // Trigger submit met 0
            setTimeout(() => handleSubmit(), 0);
          } else {
            handleSubmit();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGameFinished, showDoublePopup, showBustPopup, showInvalidScorePopup, pendingDoubleCheckout, doubleDarts, inputScore, handleSubmit, confirmDoubleCheckout]);

  const finishGameRef = useRef<string | null>(null); // Sla game UUID op om dubbele aanroep te voorkomen
  const finishGameLockRef = useRef<boolean>(false); // Lock om race conditions te voorkomen

  const finishGame = async (
    finalStates: PlayerGameState[],
    finalStats: Map<number, DartStats>
  ) => {
    // Only execute on client side
    if (typeof window === "undefined") return;

    // Voorkom dubbele aanroep - check of we al bezig zijn of al een game UUID hebben
    if (finishGameLockRef.current) {
      console.log("finishGame already in progress, skipping...");
      return;
    }

    if (finishGameRef.current) {
      return;
    }

    // Zet lock DIRECT om race conditions te voorkomen
    finishGameLockRef.current = true;

    try {
      // Maak eerst een game record aan in de games tabel
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          profile_id: finalStates[0]?.player.id, // Gebruik eerste speler als game owner
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gameError) {
        console.error("Error creating game record:", {
          code: gameError.code,
          message: gameError.message,
          details: gameError.details,
          hint: gameError.hint,
        });
        // Reset lock bij error
        finishGameLockRef.current = false;
        return;
      }

      const gameUuid = gameData.id;

      // Sla game UUID op om dubbele aanroep te voorkomen
      finishGameRef.current = gameUuid;

      // Helper functie om null/undefined waarden te filteren en NaN te vervangen
      const cleanValue = (value: unknown): string | number | boolean | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number' && isNaN(value)) return null;
        if (typeof value === 'number' && !isFinite(value)) return null;
        return value as string | number | boolean;
      };

      // Save stats for each player
      const statsPromises = finalStates.map(async (state) => {
        const playerStat = finalStats.get(state.player.id);
        if (!playerStat) return;

        // Bereken totale darts: som van alle legDarts of totalDarts * 3 (als legDarts leeg is)
        const totalDarts = playerStat.legDarts.length > 0
          ? playerStat.legDarts.reduce((sum, darts) => sum + darts, 0)
          : state.totalDarts;

        const finalStatsData = calculateFinalStats(playerStat, state.lastScore, totalDarts);

        // Filter null/undefined/NaN waarden en maak insertData object
        const insertData: Record<string, string | number | boolean | null | number[]> = {
          game_id: gameUuid,
          player_id: state.player.id,
        };

        // Voeg alle stats toe, maar filter null/NaN waarden
        Object.entries(finalStatsData).forEach(([key, value]) => {
          const cleanedValue = cleanValue(value);
          if (cleanedValue !== null) {
            insertData[key] = cleanedValue;
          }
        });

        // Check eerst of er al een record bestaat voor deze game_id en player_id
        const { data: existingData, error: checkError } = await supabase
          .from("dart_stats")
          .select("id")
          .eq("game_id", gameUuid)
          .eq("player_id", state.player.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`❌ Error checking existing stats for player ${state.player.id}:`, checkError);
        }

        // Als er al een record bestaat, skip insert
        if (existingData) {
          return;
        }

        const { data, error } = await supabase.from("dart_stats").insert(insertData).select();

        if (error) {
          console.error(`❌ Error saving stats for player ${state.player.id}:`);
          console.error(`   Code:`, error.code);
          console.error(`   Message:`, error.message);
          console.error(`   Details:`, error.details);
          console.error(`   Hint:`, error.hint);
          console.error(`   Insert Data:`, JSON.stringify(insertData, null, 2));
        } else {
        }
      });

      await Promise.all(statsPromises);
    } catch (error) {
      console.error("Error saving game stats:", error);
      // Reset lock bij error
      finishGameLockRef.current = false;
      finishGameRef.current = null;
    } finally {
      // Release lock
      finishGameLockRef.current = false;
      console.log("🔓 finishGame lock released");
    }
  };

  // Roep finishGame aan wanneer showGameFinished true wordt (maar alleen 1x)
  const finishGameTriggeredRef = useRef(false);

  useEffect(() => {
    // Reset trigger ref wanneer game niet meer finished is
    if (!showGameFinished) {
      finishGameTriggeredRef.current = false;
      return;
    }

    if (showGameFinished && winner && gameStates.length > 0 && !finishGameRef.current && !finishGameLockRef.current && !finishGameTriggeredRef.current) {
      finishGameTriggeredRef.current = true; // Zet DIRECT om race conditions te voorkomen
      const finalStats = new Map<number, DartStats>();
      playerStats.forEach((stats, playerId) => {
        finalStats.set(playerId, stats);
      });
      finishGame(gameStates, finalStats).catch((error) => {
        console.error("Error in finishGame:", error);
        // Reset ref en lock bij error zodat het opnieuw kan worden geprobeerd
        finishGameRef.current = null;
        finishGameLockRef.current = false;
        finishGameTriggeredRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGameFinished, winner]);

  const handleUndoTurn = () => {
    // Gebruik functionele update om de meest recente geschiedenis te krijgen en alles in één keer te verwerken
    setGameHistory(prev => {
      // Ga terug naar de vorige state in de geschiedenis
      if (prev.length > 0) {
        const previousState = prev[prev.length - 1];

        // Controleer of de vorige state het begin van een leg is (alle spelers hebben 0 turns)
        // Dit betekent dat we proberen de eerste beurt van een leg ongedaan te maken
        const previousIsNewLeg = previousState.gameStates.every(state => state.turns === 0);
        
        // Als de vorige state het begin van een leg is, blokkeer undo (eerste beurt kan niet ongedaan gemaakt worden)
        if (previousIsNewLeg) {
          return prev; // Geen wijziging
        }

        // Herstel alle states (React batcht deze updates)
        setGameStates(previousState.gameStates);
        setPlayerStats(previousState.playerStats);
        setCurrentPlayerIndex(previousState.currentPlayerIndex);
        setLegStartingPlayerIndex(previousState.legStartingPlayerIndex);
        setSetStartingPlayerIndex(previousState.setStartingPlayerIndex);
        setInputScore("");
        setShowDoublePopup(false);
        setPendingDoubleCheckout(null);
        setDoubleDarts(null);
        setShowGameFinished(false);
        setWinner(null);

        // Verwijder de laatste entry uit de geschiedenis
        return prev.slice(0, -1);
      } else {
        // Geen geschiedenis beschikbaar
        return prev;
      }
    });
  };

  const handleMenu = () => {
    router.push("/speel-501");
  };

  const calculateAverage = (state: PlayerGameState): number => {
    if (state.totalDarts === 0) return 0;
    return Math.round((state.totalScore / state.totalDarts) * 3 * 100) / 100;
  };

  // Start method handlers
  const handleBullsOrder = (player: Player) => {
    if (!selectedOrder.find(p => p.id === player.id)) {
      setSelectedOrder([...selectedOrder, player]);
    }
  };

  const removeFromBullsOrder = (playerId: number) => {
    setSelectedOrder(selectedOrder.filter(p => p.id !== playerId));
  };

  const confirmBullsOrder = () => {
    if (selectedOrder.length === players.length) {
      // Reorder players based on selected order
      const reorderedStates = selectedOrder.map(player => {
        const state = gameStates.find(s => s.player.id === player.id);
        return state || {
          player,
          score: startScore,
          totalScore: 0,
          totalDarts: 0,
          dartsInCurrentLeg: 0,
          lastScore: 0,
          turns: 0,
          legsWon: 0,
          setsWon: 0,
        };
      });
      setGameStates(reorderedStates);
      setPlayers(selectedOrder);
      setCurrentPlayerIndex(0);
      setLegStartingPlayerIndex(0);
      setSetStartingPlayerIndex(0);
      setShowStartPopup(false);
    }
  };

  const spinWheel = useCallback(() => {
    if (wheelSpinning) return;
    setWheelSpinning(true);

    // Gebruik crypto.getRandomValues voor betere random (als beschikbaar)
    const getRandom = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xFFFFFFFF + 1);
      }
      return Math.random();
    };

    // Genereer een willekeurige rotatie (geen speler selectie vooraf)
    // We bepalen de winnaar pas na de animatie op basis van de eindrotatie
    // Dit zorgt ervoor dat de winnaar overeenkomt met wat de live preview toont
    const spins = 5 + getRandom() * 5; // 5-10 spins
    const randomExtraRotation = getRandom() * 360; // Extra random rotatie voor variatie
    const totalRotation = (spins * 360) + randomExtraRotation;

    // Simulate rotation during spinning for live updates
    const startRotation = 0;
    const animationDuration = 3000; // 3 seconden animatie
    const startTime = Date.now();

    const updateRotation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      // Ease-out function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (totalRotation - startRotation) * easeOut;
      setCurrentWheelRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(updateRotation);
      } else {
        setCurrentWheelRotation(totalRotation);
      }
    };

    setCurrentWheelRotation(startRotation);
    setWheelRotation(totalRotation);
    requestAnimationFrame(updateRotation);

    // Na 3 seconden: stop animatie en bepaal winnaar op basis van eindrotatie
    setTimeout(() => {
      setWheelSpinning(false);
      setCurrentWheelRotation(totalRotation);

      // Gebruik EXACT dezelfde logica als de live preview (useEffect) om de winnaar te bepalen
      // Dit zorgt ervoor dat de winnaar overeenkomt met wat je tijdens het draaien ziet
      const normalizedRotation = totalRotation % 360;
      const degreesPerPlayer = 360 / players.length;
      let finalPlayerIndex = Math.floor((360 - normalizedRotation) / degreesPerPlayer) % players.length;
      if (finalPlayerIndex < 0) finalPlayerIndex += players.length;


      // Reorder players so selected player is first (bovenste/meest links)
      const reorderedPlayers = [
        ...players.slice(finalPlayerIndex),
        ...players.slice(0, finalPlayerIndex)
      ];
      setPlayers(reorderedPlayers);

      // Reorder game states to match
      const reorderedStates = [
        ...gameStates.slice(finalPlayerIndex),
        ...gameStates.slice(0, finalPlayerIndex)
      ];
      setGameStates(reorderedStates);


      // Set the starting player (now at index 0 after reordering) - dit is de winnaar
      setCurrentPlayerIndex(0);
      setLegStartingPlayerIndex(0);
      setSetStartingPlayerIndex(0);

      // Toon popup met winnaar voor 2 seconden
      if (showStartPopup && !popupShownRef.current) {
        popupShownRef.current = true; // Mark popup as shown
        setStartingPlayer(reorderedPlayers[0]);
        setShowStartingPlayerPopup(true);

        // Close popups after 2 seconden
        popupTimeoutRef.current = setTimeout(() => {
          setShowStartingPlayerPopup(false);
          setShowStartPopup(false);
          popupShownRef.current = false; // Reset flag
          popupTimeoutRef.current = null;
        }, 2000);
      } else {
        // If popup shouldn't be shown, just close the start popup
        setShowStartPopup(false);
      }
    }, animationDuration);
  }, [wheelSpinning, players, gameStates, showStartPopup]);

  const flipCoin = useCallback(() => {
    if (coinFlipping) return;
    setCoinFlipping(true);
    setCoinResult(null); // Reset result before flipping

    // Gebruik crypto.getRandomValues voor betere random (als beschikbaar)
    const getRandom = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xFFFFFFFF + 1);
      }
      return Math.random();
    };

    // 7 volledige rondjes
    const sevenRotations = 7 * 360; // 2520 graden

    // Random: 50/50 kans op 0 of 180 graden extra
    const randomExtra = getRandom() < 0.5 ? 0 : 180;

    // Startpositie
    const startRotation = ((coinRotation % 360) + 360) % 360;

    // Bepaal waar we op uitkomen na 7 rondjes + random extra
    const roughEndPosition = (startRotation + sevenRotations + randomExtra) % 360;

    // Bepaal exacte eindpositie: 0 of 180 graden
    // Als roughEndPosition < 180, dan eindigen we op 0 (heads)
    // Als roughEndPosition >= 180, dan eindigen we op 180 (tails)
    const endPosition = roughEndPosition < 180 ? 0 : 180;

    // Bereken hoeveel we moeten draaien om exact op endPosition uit te komen
    // We moeten van startRotation naar endPosition draaien
    let rotationToEnd = 0;
    if (endPosition === 0) {
      // We moeten naar 0 graden eindigen
      rotationToEnd = startRotation === 0 ? 360 : 360 - startRotation;
    } else {
      // We moeten naar 180 graden eindigen
      if (startRotation < 180) {
        rotationToEnd = 180 - startRotation;
      } else if (startRotation > 180) {
        rotationToEnd = 360 - startRotation + 180;
      } else {
        rotationToEnd = 360; // Al op 180, draai een volledige rotatie extra
      }
    }

    // Totale rotatie: 7 rondjes + rotatie naar exacte eindpositie
    // Dit garandeert dat we exact op 0 of 180 graden eindigen
    const totalRotation = startRotation + sevenRotations + rotationToEnd;

    // Bepaal resultaat: 0 graden = heads (KOP) = speler 0, 180 graden = tails (MUNT) = speler 1
    const result = endPosition === 0 ? "heads" : "tails";


    // Animatieduur: 3 seconden
    const duration = 3000;
    const startTime = Date.now();

    const updateRotation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out function voor soepele deceleratie
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (totalRotation - startRotation) * easeOut;
      setCoinRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(updateRotation);
      } else {
        // Animatie klaar - zet exact op eindpositie (0 of 180 graden)
        setCoinRotation(endPosition);
      }
    };

    setCoinRotation(startRotation);
    requestAnimationFrame(updateRotation);

    // Na animatie: bepaal resultaat en winnaar
    setTimeout(() => {
      setCoinRotation(endPosition);
      setCoinResult(result);
      setCoinFlipping(false);

      // Bepaal welke speler begint op basis van resultaat
      // Heads (KOP) = speler 0, Tails (MUNT) = speler 1
      let startingPlayerIndex: number;
      if (result === "heads") {
        startingPlayerIndex = 0;
        setCurrentPlayerIndex(0);
        setLegStartingPlayerIndex(0);
        setSetStartingPlayerIndex(0);
      } else {
        startingPlayerIndex = 1;
        setCurrentPlayerIndex(1);
        setLegStartingPlayerIndex(1);
        setSetStartingPlayerIndex(1);
      }


      // Toon popup met winnaar voor 2 seconden
      if (showStartPopup && !popupShownRef.current) {
        popupShownRef.current = true; // Mark popup as shown
        setStartingPlayer(players[startingPlayerIndex]);
        setShowStartingPlayerPopup(true);

        // Close popups after 2 seconden
        popupTimeoutRef.current = setTimeout(() => {
          setShowStartingPlayerPopup(false);
          setShowStartPopup(false);
          popupShownRef.current = false; // Reset flag
          popupTimeoutRef.current = null;
        }, 2000);
      } else {
        // If popup shouldn't be shown, just close the start popup
        setShowStartPopup(false);
      }
    }, duration);
  }, [coinFlipping, players, showStartPopup, coinRotation]);

  // Function to request device motion permission (must be called in user gesture context)
  const requestMotionPermission = async () => {
    if (typeof window === "undefined") {
      return false;
    }

    // Check if page is loaded over HTTPS (required for iOS)
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("127.0.0.1")) {
      console.warn("Device motion requires HTTPS (or localhost)");
      alert("Voor schudden is een beveiligde verbinding (HTTPS) nodig. De app werkt nog steeds, maar schudden is niet beschikbaar.");
      return false;
    }

    if (typeof DeviceMotionEvent === "undefined") {
      return false;
    }

    const DeviceMotionEventWithPerm = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    // Check if permission request is available (iOS 13+)
    if (typeof DeviceMotionEventWithPerm.requestPermission === "function") {
      try {
        setShowPermissionInstructions(true);

        // Request permission - this should show a native popup on iOS
        const permission = await DeviceMotionEventWithPerm.requestPermission();

        setShowPermissionInstructions(false);

        if (permission === "granted") {
          setMotionPermissionGranted(true);
          return true;
        } else if (permission === "denied") {
          setMotionPermissionGranted(false);
          alert("Toestemming geweigerd. Je kunt nog steeds op de knop klikken om handmatig te flippen/draaien.\n\nOm schudden in te schakelen, ga naar Instellingen > Safari > Beweging en toegang tot beweging toestaan.");
          return false;
        } else {
          setMotionPermissionGranted(false);
          return false;
        }
      } catch (error) {
        console.error("Error requesting motion permission:", error);
        setShowPermissionInstructions(false);
        setMotionPermissionGranted(false);
        // Try to continue anyway - maybe permission isn't needed
        return false;
      }
    } else {
      // No permission required (Android, older iOS, or desktop)
      setMotionPermissionGranted(true);
      return true;
    }
  };

  // Calculate current player based on wheel rotation (for live indicator)
  useEffect(() => {
    if (startMethod !== "wheel" || players.length === 0) {
      setCurrentWheelPlayer(null);
      return;
    }

    const calculateCurrentPlayer = (rotation: number) => {
      const normalizedRotation = rotation % 360;
      const degreesPerPlayer = 360 / players.length;
      // The pointer is at the top (0 degrees), so we need to account for the rotation
      // Since the wheel rotates, we need to reverse the calculation
      let selectedIndex = Math.floor((360 - normalizedRotation) / degreesPerPlayer) % players.length;
      if (selectedIndex < 0) selectedIndex += players.length;
      return players[selectedIndex];
    };

    // Use currentWheelRotation for live updates during spinning, otherwise use wheelRotation
    const rotationToUse = wheelSpinning ? currentWheelRotation : wheelRotation;
    setCurrentWheelPlayer(calculateCurrentPlayer(rotationToUse));
  }, [currentWheelRotation, wheelRotation, players, wheelSpinning, startMethod]);

  // Reset states when startMethod changes or popup opens
  useEffect(() => {
    if (showStartPopup && startMethod) {
      // Reset spinning/flipping states when menu opens
      setWheelSpinning(false);
      setCoinFlipping(false);
      setCoinResult(null);
      setShakeDetectionReady(false);
      setHasShaken(false); // Reset shake state
      setCurrentWheelPlayer(null); // Reset current wheel player
      setCurrentWheelRotation(0); // Reset current wheel rotation

      // Small delay before enabling shake detection to prevent accidental triggers
      const timer = setTimeout(() => {
        setShakeDetectionReady(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShakeDetectionReady(false);
      setHasShaken(false);
    }
  }, [showStartPopup, startMethod]);

  // Device motion for shake detection
  useEffect(() => {
    if (!showStartPopup) return;
    if (typeof window === "undefined") return;
    if (!shakeDetectionReady) return; // Don't detect shakes until ready

    let lastShakeTime = 0;

    // Detect device type for platform-specific thresholds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Platform-specific thresholds
    // iPhone is more sensitive, needs higher threshold (26-32)
    // Android needs lower threshold (20-25)
    const shakeThreshold = isIOS ? 29 : isAndroid ? 22 : 25; // Default to Android-like if unknown
    const deltaThreshold = isIOS ? 8 : isAndroid ? 5 : 6; // Delta threshold also platform-specific

    let listenerAdded = false;

    // Store previous acceleration values for better shake detection
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let eventCount = 0;
    const calibrationEvents = 5; // Ignore first 5 events for calibration

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      // Try accelerationIncludingGravity first (Android), then acceleration (iOS)
      let acceleration = event.accelerationIncludingGravity;
      if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
        acceleration = event.acceleration;
      }

      if (!acceleration) return;
      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      eventCount++;

      // Calibration: use first few events to set baseline, don't detect shakes yet
      // This prevents false positives from the initial jump from 0 to actual values
      if (eventCount <= calibrationEvents) {
        lastX = x;
        lastY = y;
        lastZ = z;
        return; // Don't process shake detection during calibration
      }

      // Only calculate delta if we have previous values (should always be true after calibration)
      if (lastX === null || lastY === null || lastZ === null) {
        lastX = x;
        lastY = y;
        lastZ = z;
        return;
      }

      // Calculate change in acceleration (better for shake detection)
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      const totalDelta = deltaX + deltaY + deltaZ;

      // Also calculate acceleration magnitude
      const accelerationMagnitude = Math.sqrt(x * x + y * y + z * z);

      // Update last values
      lastX = x;
      lastY = y;
      lastZ = z;

      const currentTime = Date.now();
      const timeSinceLastShake = currentTime - lastShakeTime;

      // Use both delta and magnitude for better detection
      // Platform-specific thresholds ensure appropriate sensitivity
      const isShake = (totalDelta > deltaThreshold || accelerationMagnitude > shakeThreshold) && timeSinceLastShake > 800;

      if (isShake) {
        lastShakeTime = currentTime;

        // Shake detected - removed verbose logging for performance

        // Mark that user has actually shaken the device (first shake)
        if (!hasShaken && shakeDetectionReady) {
          setHasShaken(true);
          return; // Don't trigger on first shake, wait for second shake
        }

        // Only trigger if shake detection is ready AND user has already shaken once
        if (shakeDetectionReady && hasShaken) {
          if (startMethod === "wheel" && !wheelSpinning) {
            spinWheel();
          } else if (startMethod === "coin" && !coinFlipping && players.length === 2) {
            flipCoin();
          }
        }
      }
    };

    const setupDeviceMotion = async () => {
      if (listenerAdded) {
        return;
      }

      // Check if DeviceMotionEvent is available
      if (typeof DeviceMotionEvent === "undefined") {
        return;
      }

      // For iOS 13+ and some browsers, we need to request permission
      const DeviceMotionEventWithPerm = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };

      try {
        // If permission is already granted (from button click), add listener directly
        if (motionPermissionGranted || typeof DeviceMotionEventWithPerm.requestPermission !== "function") {
          window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
          listenerAdded = true;
          if (!motionPermissionGranted) {
            setMotionPermissionGranted(true);
          }
        } else {
          // Try to request permission (but this might not work if not in user gesture)
          const permission = await DeviceMotionEventWithPerm.requestPermission();
          if (permission === "granted") {
            window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
            listenerAdded = true;
            setMotionPermissionGranted(true);
          } else {
            setMotionPermissionGranted(false);
          }
        }
      } catch (error) {
        console.error("Error setting up device motion:", error);
        // Try to add listener anyway for browsers that don't require permission
        try {
          window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
          listenerAdded = true;
          setMotionPermissionGranted(true);
        } catch (e) {
          console.error("Failed to add device motion listener:", e);
          setMotionPermissionGranted(false);
        }
      }
    };

    // Set up device motion listener
    // If permission is already granted, set up immediately
    // Otherwise, wait for permission to be granted via button click
    if (motionPermissionGranted) {
      setupDeviceMotion();
    } else if (typeof DeviceMotionEvent !== "undefined") {
      const DeviceMotionEventWithPerm = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      // If permission is not required (Android, older iOS), set up immediately
      if (typeof DeviceMotionEventWithPerm.requestPermission !== "function") {
        setupDeviceMotion();
      }
    }

    return () => {
      window.removeEventListener("devicemotion", handleDeviceMotion);
      listenerAdded = false;
    };
  }, [showStartPopup, startMethod, wheelSpinning, coinFlipping, players.length, flipCoin, spinWheel, motionPermissionGranted, shakeDetectionReady, hasShaken]);

  if (typeof window === "undefined" || players.length === 0 || gameStates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A294F]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  const isTwoPlayers = players.length === 2;

  // Starting Player Popup
  if (showStartingPlayerPopup && startingPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A294F] bg-opacity-90 p-4">
        <div className="bg-[#E8F0FF] rounded-2xl p-8 shadow-2xl w-full max-w-md text-center">
          <div className="mb-6">
            {startingPlayer.avatar_url ? (
              <Image
                src={startingPlayer.avatar_url}
                alt={startingPlayer.username}
                width={96}
                height={96}
                className="rounded-full object-cover mx-auto mb-4"
                style={{ width: "96px", height: "96px" }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#0A294F] flex items-center justify-center text-[#E8F0FF] font-bold text-4xl mx-auto mb-4">
                {startingPlayer.username.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-bold text-[#000000] mb-2">
              {startingPlayer.username} begint!
            </h2>
            <p className="text-sm text-[#7E838F]">
              De speler die mag beginnen
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Start Popup
  if (showStartPopup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A294F] p-4 relative">
        {/* Terug pijltje linksboven */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => {
              if (startMethod) {
                // Als we in een DIY scherm zitten, ga terug naar menu
                setStartMethod(null);
                setSelectedOrder([]);
                setWheelRotation(0);
                setCoinResult(null);
                setCoinRotation(0);
              } else {
                // Als we in het menu zitten, ga naar speel-501
                router.push("/speel-501");
              }
            }}
            className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-white rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
          >
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
        </div>
        <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-[#000000] mb-6 text-center">
            Kies startmethode
          </h2>

          {!startMethod ? (
            <div className="space-y-4">
              <button
                onClick={() => setStartMethod("bulls")}
                className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150"
              >
                Bullen
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  console.log("Wheel button clicked - requesting permission...");
                  const granted = await requestMotionPermission();
                  console.log("Permission result for wheel:", granted);
                  setStartMethod("wheel");
                }}
                className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150"
              >
                Radje draaien
              </button>
              {isTwoPlayers && (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    await requestMotionPermission();
                    setStartMethod("coin");
                  }}
                  className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150"
                >
                  Coin flip
                </button>
              )}
            </div>
          ) : startMethod === "bulls" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#000000] mb-4">
                Kies volgorde (klik op spelers)
              </h3>
              <div className="space-y-2 mb-4">
                {players.map((player) => {
                  const orderIndex = selectedOrder.findIndex(p => p.id === player.id);
                  const isSelected = orderIndex !== -1;
                  return (
                    <button
                      key={player.id}
                      onClick={() => {
                        if (isSelected) {
                          removeFromBullsOrder(player.id);
                        } else {
                          handleBullsOrder(player);
                        }
                      }}
                      className={`w-full py-3 px-4 rounded-lg text-left transition-all duration-150 ${isSelected
                        ? "bg-[#0A294F] text-white"
                        : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {player.avatar_url ? (
                            <Image
                              src={player.avatar_url}
                              alt={player.username}
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                              style={{ width: "24px", height: "24px" }}
                            />
                          ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs ${isSelected ? "bg-[#28C7D8] text-white" : "bg-[#0A294F] text-white"
                              }`}>
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold">{player.username}</span>
                        </div>
                        {isSelected && (
                          <span className="text-sm">#{orderIndex + 1}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStartMethod(null);
                    setSelectedOrder([]);
                  }}
                  className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold border-2 border-[#0A294F] hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150"
                >
                  Terug
                </button>
                <button
                  onClick={confirmBullsOrder}
                  disabled={selectedOrder.length !== players.length}
                  className="flex-1 py-3 px-4 bg-[#28C7D8] text-white rounded-xl font-semibold hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bevestigen
                </button>
              </div>
            </div>
          ) : startMethod === "wheel" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#000000] mb-4 text-center">
                Radje draaien
              </h3>
              <div className="relative w-64 h-64 mx-auto mb-4">
                <div
                  className="absolute inset-0 rounded-full border-8 border-[#0A294F] transition-transform duration-3000 ease-out"
                  style={{
                    transform: `rotate(${wheelSpinning ? currentWheelRotation : wheelRotation}deg)`,
                    background: `conic-gradient(${players.map((_, i) => {
                      const colors = ["#28C7D8", "#E8F0FF", "#0A294F", "#D0E0FF", "#22a8b7", "#7E838F"];
                      return `${colors[i % colors.length]} ${(i / players.length) * 360}deg ${((i + 1) / players.length) * 360}deg`;
                    }).join(", ")})`,
                    transition: wheelSpinning ? "none" : "transform 0s",
                  }}
                />
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#0A294F]" />
                </div>
              </div>

              {/* Live indicator - shows current player being pointed at */}
              {currentWheelPlayer && (
                <div className="bg-[#E8F0FF] rounded-xl p-6 mb-4 border-2 border-[#0A294F]">
                  <div className="text-center">
                    <p className="text-xs font-medium text-[#7E838F] mb-2 uppercase tracking-wide">
                      {wheelSpinning ? "Draait..." : "Winnaar"}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {currentWheelPlayer.avatar_url ? (
                        <Image
                          src={currentWheelPlayer.avatar_url}
                          alt={currentWheelPlayer.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          style={{ width: "40px", height: "40px" }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-lg">
                          {currentWheelPlayer.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <h3 className="text-2xl font-bold text-[#000000]">
                        {currentWheelPlayer.username}
                      </h3>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-center mb-4">
                <p className="text-sm text-[#7E838F]">
                  {wheelSpinning
                    ? "Radje draait..."
                    : showPermissionInstructions
                      ? "Wacht op toestemmingsvenster..."
                      : motionPermissionGranted
                        ? "Schud je telefoon of klik op draaien"
                        : "Klik op draaien om toestemming te geven voor schudden"}
                </p>
                {!motionPermissionGranted && !showPermissionInstructions && (
                  <div className="text-xs text-[#7E838F] mt-2 px-4 space-y-1">
                    <p>Er verschijnt een popup bovenaan je scherm. Klik op &quot;Toestaan&quot; om schudden in te schakelen.</p>
                    <p className="text-[#0A294F] font-semibold mt-2">Als er geen popup verschijnt:</p>
                    <p>Ga naar Instellingen → Safari → Beweging en toegang tot beweging toestaan</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStartMethod(null);
                    setWheelRotation(0);
                  }}
                  className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold border-2 border-[#0A294F] hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150"
                >
                  Terug
                </button>
                <button
                  onClick={spinWheel}
                  disabled={wheelSpinning}
                  className="flex-1 py-3 px-4 bg-[#28C7D8] text-white rounded-xl font-semibold hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {wheelSpinning ? "Draait..." : "Draaien"}
                </button>
              </div>
            </div>
          ) : startMethod === "coin" && isTwoPlayers ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#000000] mb-4 text-center">
                Coin flip
              </h3>
              <div
                className="relative w-48 h-48 mx-auto mb-4"
                style={{
                  perspective: "1000px",
                }}
              >
                <div
                  className="relative w-full h-full"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateY(${coinRotation}deg)`,
                    transition: coinFlipping ? "none" : "transform 0s",
                  }}
                >
                  {/* Heads side - Player 1 */}
                  <div
                    className="absolute inset-0 rounded-full border-4 border-[#0A294F] bg-[#28C7D8] flex flex-col items-center justify-center text-white font-bold"
                    style={{
                      transform: "rotateY(0deg) translateZ(2px)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    <div className="text-xs mb-1">KOP</div>
                    <div className="text-lg">{players[0].username}</div>
                  </div>

                  {/* Tails side - Player 2 */}
                  <div
                    className="absolute inset-0 rounded-full border-4 border-[#0A294F] bg-[#0A294F] flex flex-col items-center justify-center text-white font-bold"
                    style={{
                      transform: "rotateY(180deg) translateZ(2px)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    <div className="text-xs mb-1">MUNT</div>
                    <div className="text-lg">{players[1].username}</div>
                  </div>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-sm text-[#7E838F]">
                  {coinFlipping
                    ? "Munt draait..."
                    : coinResult
                      ? `${coinResult === "heads" ? players[0].username : players[1].username} begint!`
                      : showPermissionInstructions
                        ? "Wacht op toestemmingsvenster..."
                        : motionPermissionGranted
                          ? "Schud je telefoon of klik op flippen"
                          : "Klik op flippen om toestemming te geven voor schudden"}
                </p>
                {!motionPermissionGranted && !showPermissionInstructions && !coinResult && (
                  <div className="text-xs text-[#7E838F] mt-2 px-4 space-y-1">
                    <p>Er verschijnt een popup bovenaan je scherm. Klik op &quot;Toestaan&quot; om schudden in te schakelen.</p>
                    <p className="text-[#0A294F] font-semibold mt-2">Als er geen popup verschijnt:</p>
                    <p>Ga naar Instellingen → Safari → Beweging en toegang tot beweging toestaan</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStartMethod(null);
                    setCoinResult(null);
                    setCoinRotation(0);
                  }}
                  className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold border-2 border-[#0A294F] hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150"
                >
                  Terug
                </button>
                <button
                  onClick={flipCoin}
                  disabled={coinFlipping}
                  className="flex-1 py-3 px-4 bg-[#28C7D8] text-white rounded-xl font-semibold hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {coinFlipping ? "Flipt..." : "Flippen"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A294F] pt-4 pb-6 px-4">
      {/* Header met scorebord en logo */}
      <div className="mb-6 relative">
        <div className="flex justify-between items-start">
          {/* Scorebord linksboven */}
          <div>
            <div className="text-white font-semibold text-lg">
              {gameMode === "first-to" ? "First to" : "Best of"} {target} {gameType}
            </div>
          </div>

          {/* Logo rechtsboven */}
          <div>
            <Link href="/">
              <Image
                src="/logo wit dartclub.png"
                alt="DartClub Logo"
                width={50}
                height={50}
                className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Spelers display */}
      {isTwoPlayers ? (
        <div className="grid grid-cols-12 mb-6">
          <div className="col-span-12 md:col-span-8 md:col-start-3">
            <div className="flex rounded-2xl overflow-hidden relative">
              {/* Speler 1 - Links */}
              <div
                className={`flex-1 p-4 transition-all duration-200 relative bg-[#28C7D8] ${currentPlayerIndex === 0 ? "scale-105 z-20" : ""} ${currentPlayerIndex === 1 ? "shadow-[10px_0_30px_rgba(255,255,255,1)] z-10" : ""
                  }`}
              >
                <div className={`relative z-10 h-full flex flex-col items-center justify-center ${currentPlayerIndex !== 0 ? "opacity-80" : ""}`}>
                  {/* Naam bovenaan gecentreerd */}
                  <div className="font-semibold text-xl mb-4 text-white text-center flex items-center justify-center gap-2">
                    {0 === legStartingPlayerIndex && (
                      <div className="w-4 h-4 rounded-full bg-white" />
                    )}
                    {gameStates[0].player.avatar_url ? (
                      <Image
                        src={gameStates[0].player.avatar_url}
                        alt={gameStates[0].player.username}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        style={{ width: "32px", height: "32px" }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
                        {gameStates[0].player.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {gameStates[0].player.username}
                  </div>
                  {/* Score en Legs/Sets gecentreerd */}
                  <div className="flex items-center justify-center gap-6 flex-1 w-full">
                    {/* Legs en Sets */}
                    <div className="text-white text-center">
                      <div className="text-sm font-bold">
                        L {gameStates[0].legsWon}
                      </div>
                      {gameType === "sets" && (
                        <div className="text-sm font-bold">
                          S {gameStates[0].setsWon}
                        </div>
                      )}
                    </div>
                    {/* Score */}
                    <div className="flex flex-col items-center ml-2">
                      <div className="text-4xl font-bold text-white">
                        {gameStates[0].score}
                      </div>
                      {currentPlayerIndex === 0 && (
                        <div
                          className="h-1.5 mt-2 bg-white animate-underline-expand animate-underline-pulse"
                          style={{ width: "100%" }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Statistieken onderin gecentreerd */}
                  <div className="text-xs space-y-1 text-white/80 text-center mt-4">
                    <div>3-dart avg: {calculateAverage(gameStates[0])}</div>
                    <div>Darts: {gameStates[0].dartsInCurrentLeg}</div>
                    <div>Laatst: {gameStates[0].lastScore}</div>
                  </div>
                </div>
              </div>

              {/* Speler 2 - Rechts */}
              <div
                className={`flex-1 p-4 transition-all duration-200 relative bg-[#EEEEEE] ${currentPlayerIndex === 1 ? "scale-105 z-20" : ""} ${currentPlayerIndex === 0 ? "shadow-[-10px_0_30px_rgba(10,41,79,1)] z-10" : ""
                  }`}
              >
                <div className={`relative z-10 h-full flex flex-col items-center justify-center ${currentPlayerIndex !== 1 ? "opacity-80" : ""}`}>
                  {/* Naam bovenaan gecentreerd */}
                  <div className="font-semibold text-xl mb-4 text-[#000000] text-center flex items-center justify-center gap-2">
                    {1 === legStartingPlayerIndex && (
                      <div className="w-4 h-4 rounded-full bg-[#28C7D8]" />
                    )}
                    {gameStates[1].player.avatar_url ? (
                      <Image
                        src={gameStates[1].player.avatar_url}
                        alt={gameStates[1].player.username}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        style={{ width: "32px", height: "32px" }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0A294F]/20 flex items-center justify-center text-[#0A294F] font-semibold text-sm">
                        {gameStates[1].player.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {gameStates[1].player.username}
                  </div>
                  {/* Score en Legs/Sets gecentreerd */}
                  <div className="flex items-center justify-center gap-6 flex-1 w-full">
                    {/* Legs en Sets */}
                    <div className="text-[#000000] text-center">
                      <div className="text-sm font-bold">
                        L {gameStates[1].legsWon}
                      </div>
                      {gameType === "sets" && (
                        <div className="text-sm font-bold">
                          S {gameStates[1].setsWon}
                        </div>
                      )}
                    </div>
                    {/* Score */}
                    <div className="flex flex-col items-center ml-2">
                      <div className="text-4xl font-bold text-[#000000]">
                        {gameStates[1].score}
                      </div>
                      {currentPlayerIndex === 1 && (
                        <div
                          className="h-1.5 mt-2 bg-[#0A294F] animate-underline-expand animate-underline-pulse"
                          style={{ width: "100%" }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Statistieken onderin gecentreerd */}
                  <div className="text-xs space-y-1 text-[#7E838F] text-center mt-4">
                    <div>3-dart avg: {calculateAverage(gameStates[1])}</div>
                    <div>Darts: {gameStates[1].dartsInCurrentLeg}</div>
                    <div>Laatst: {gameStates[1].lastScore}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 mb-6">
          <div className="col-span-12 md:col-span-8 md:col-start-3 space-y-2">
            {gameStates.map((state, index) => {
              const isCurrentPlayer = index === currentPlayerIndex;
              const isBlue = index % 2 === 0;
              const nextIndex = (index + 1) % gameStates.length;
              const prevIndex = (index - 1 + gameStates.length) % gameStates.length;
              
              // Als blauw aan de beurt is, geef de volgende (witte) speler een blauwe shadow
              // Als wit aan de beurt is, geef de vorige (blauwe) speler een witte shadow
              const shouldHaveBlueShadow = !isCurrentPlayer && currentPlayerIndex !== undefined && 
                gameStates[currentPlayerIndex] && currentPlayerIndex % 2 === 0 && index === nextIndex;
              const shouldHaveWhiteShadow = !isCurrentPlayer && currentPlayerIndex !== undefined && 
                gameStates[currentPlayerIndex] && currentPlayerIndex % 2 === 1 && index === prevIndex;
              
              return (
              <div
                key={state.player.id}
                className={`rounded-xl p-3 flex items-center justify-between transition-all duration-200 relative ${isCurrentPlayer
                  ? isBlue
                    ? "bg-[#28C7D8] scale-[1.02] sm:scale-100 z-20"
                    : "bg-[#EEEEEE] scale-[1.02] sm:scale-100 z-20"
                  : isBlue
                    ? "bg-[#28C7D8]"
                    : "bg-[#EEEEEE]"
                  } ${shouldHaveBlueShadow ? "shadow-[0_0_40px_rgba(10,41,79,1)]" : ""} ${shouldHaveWhiteShadow ? "shadow-[0_0_40px_rgba(255,255,255,1)]" : ""}`}
              >
                <div className={`flex items-center gap-3 flex-1 ${index !== currentPlayerIndex ? "opacity-80" : ""}`}>
                  {index === legStartingPlayerIndex && (
                    <div className={`w-4 h-4 rounded-full ${index % 2 === 0 ? "bg-white" : "bg-[#28C7D8]"
                      }`} />
                  )}
                  {state.player.avatar_url ? (
                    <Image
                      src={state.player.avatar_url}
                      alt={state.player.username}
                      width={28}
                      height={28}
                      className={`rounded-full object-cover ${players.length > 3 ? "hidden sm:block" : ""}`}
                      style={{ width: "28px", height: "28px" }}
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs ${index % 2 === 0 ? "bg-white/20 text-white" : "bg-[#0A294F]/20 text-[#0A294F]"
                        } ${players.length > 3 ? "hidden sm:flex" : ""}`}
                    >
                      {state.player.username.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                </div>
                <div className={`flex items-center gap-4 ${index !== currentPlayerIndex ? "opacity-80" : ""}`}>
                  <div className={`font-bold ${index % 2 === 0 ? "text-white" : "text-[#000000]"
                    }`}>
                    {/* Op mobile met meer dan 3 spelers: L en S op één regel, anders onder elkaar */}
                    {gameType === "sets" && (
                      <div className={players.length > 3 ? "block sm:hidden text-xs" : "hidden"}>
                        L {state.legsWon} · S {state.setsWon}
                      </div>
                    )}
                    <div className={players.length > 3 ? "hidden sm:block text-sm" : "block text-sm"}>
                      L {state.legsWon}
                    </div>
                    {gameType === "sets" && (
                      <div className={players.length > 3 ? "hidden sm:block text-sm" : "block text-sm"}>
                        S {state.setsWon}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <div
                      className={`text-xl font-bold ${index % 2 === 0 ? "text-white" : "text-[#000000]"
                        }`}
                    >
                      {state.score}
                    </div>
                    {isCurrentPlayer && (
                      <div
                        className={`h-1 mt-1.5 ${index % 2 === 0 ? "bg-white" : "bg-[#0A294F]"
                          } animate-underline-expand animate-underline-pulse`}
                        style={{ width: "100%" }}
                      />
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wie is aan de beurt - onder het scorebord */}
      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <div className="text-white text-xl font-semibold mt-2 text-left">
            {gameStates[currentPlayerIndex].player.username} is aan de beurt!
          </div>
        </div>
      </div>

      {/* Huidige invoer balkje */}
      <div className="grid grid-cols-12 mb-5">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <div className="bg-[#EEEEEE] rounded-lg px-6 py-4 w-full">
            <span className="text-5xl font-bold text-[#000000] text-left block">
              {inputScore || "0"}
            </span>
          </div>
        </div>
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
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
            id="submit-score-button"
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
      </div>

      {/* Double Checkout Popup */}
      {
        showDoublePopup && pendingDoubleCheckout && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-[#0A294F] bg-opacity-40 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => {
                // Prevent closing without selection
              }}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <h2 className="text-[#000000] font-semibold text-xl mb-2">
                    {pendingDoubleCheckout.isCheckout ? "Uitgegooid!" : "Mogelijke finish"}
                  </h2>
                  {pendingDoubleCheckout.isCheckout ? (
                    <p className="text-[#7E838F] text-sm">
                      Hoeveel pijlen heb je op een dubbel gegooid?
                    </p>
                  ) : (
                    <>
                      <p className="text-[#7E838F] text-sm mb-2">
                        Je staat op {pendingDoubleCheckout.currentState.score - pendingDoubleCheckout.score}
                      </p>
                      <p className="text-[#7E838F] text-sm">
                        Hoeveel pijlen heb je op een dubbel gegooid?
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-3 mb-6 justify-center">
                  {pendingDoubleCheckout.possibleDartsOnDouble
                    .sort((a, b) => a - b)
                    .map((num) => (
                      <button
                        key={num}
                        onClick={() => setDoubleDarts(num)}
                        className={`w-20 py-4 px-4 rounded-xl font-semibold text-lg transition-all duration-150 ${doubleDarts === num
                          ? "bg-[#0A294F] text-[#E8F0FF]"
                          : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                </div>

                <button
                  onClick={confirmDoubleCheckout}
                  disabled={doubleDarts === null}
                  className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bevestigen
                </button>
              </div>
            </div>
          </>
        )
      }

      {/* Game Finished Screen */}
      {
        showGameFinished && winner && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-[#0A294F] bg-opacity-90 backdrop-blur-sm z-50 transition-opacity duration-300" />

            {/* Modal */}
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="min-h-full flex items-start justify-center p-4 py-8">
                <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-4xl">
                  {/* Winnaar header */}
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-[#000000] mb-2">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        {winner.player.avatar_url ? (
                          <Image
                            src={winner.player.avatar_url}
                            alt={winner.player.username}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                            style={{ width: "48px", height: "48px" }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-xl">
                            {winner.player.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{winner.player.username}</span>
                      </div>
                      <span className="block">heeft gewonnen!</span>
                    </h1>
                    <p className="text-[#7E838F] text-sm">
                      {gameMode === "first-to" ? "First to" : "Best of"} {target} {gameType}
                    </p>
                  </div>

                  {/* Stand bovenaan */}
                  <div className="mb-6 bg-[#0A294F] rounded-xl p-4">
                    <div className="text-center text-white font-bold text-lg mb-3">Stand</div>
                    <div className="flex justify-center items-center gap-4">
                      {gameStates.length >= 2 && (
                        <>
                          <div className="flex items-center gap-2 text-white font-semibold text-base">
                            {gameStates[0].player.avatar_url ? (
                              <Image
                                src={gameStates[0].player.avatar_url}
                                alt={gameStates[0].player.username}
                                width={24}
                                height={24}
                                className="rounded-full object-cover"
                                style={{ width: "24px", height: "24px" }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-xs">
                                {gameStates[0].player.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {gameStates[0].player.username}
                          </div>
                          <div className="text-[#28C7D8] font-bold text-3xl">
                            {gameType === "sets" ? gameStates[0].setsWon : gameStates[0].legsWon} - {gameType === "sets" ? gameStates[1].setsWon : gameStates[1].legsWon}
                          </div>
                          <div className="flex items-center gap-2 text-white font-semibold text-base">
                            {gameStates[1].player.avatar_url ? (
                              <Image
                                src={gameStates[1].player.avatar_url}
                                alt={gameStates[1].player.username}
                                width={24}
                                height={24}
                                className="rounded-full object-cover"
                                style={{ width: "24px", height: "24px" }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-xs">
                                {gameStates[1].player.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {gameStates[1].player.username}
                          </div>
                        </>
                      )}
                      {gameStates.length === 1 && (
                        <div className="text-center">
                          <div className="text-white font-semibold text-base">{gameStates[0].player.username}</div>
                          <div className="text-[#28C7D8] font-bold text-3xl">
                            {gameType === "sets" ? gameStates[0].setsWon : gameStates[0].legsWon}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistieken tabel */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#0A294F] text-white">
                          <th className="p-3 text-left font-semibold border border-[#0A294F]">
                            {gameStates[0]?.player.username || "Speler 1"}
                          </th>
                          <th className="p-3 text-center font-semibold border border-[#0A294F]">Statistiek</th>
                          <th className="p-3 text-right font-semibold border border-[#0A294F]">
                            {gameStates[1]?.player.username || "Speler 2"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const player1Stat = playerStats.get(gameStates[0]?.player.id) || createInitialStats();
                          const player2Stat = gameStates[1] ? (playerStats.get(gameStates[1]?.player.id) || createInitialStats()) : createInitialStats();

                          const player1Avg = player1Stat.totalTurns > 0 ? Math.round((player1Stat.totalScore / player1Stat.totalTurns) * 100) / 100 : 0;
                          const player2Avg = player2Stat.totalTurns > 0 ? Math.round((player2Stat.totalScore / player2Stat.totalTurns) * 100) / 100 : 0;

                          const player1First9Avg = player1Stat.first9Turns > 0 ? Math.round((player1Stat.first9Score / player1Stat.first9Turns) * 100) / 100 : 0;
                          const player2First9Avg = player2Stat.first9Turns > 0 ? Math.round((player2Stat.first9Score / player2Stat.first9Turns) * 100) / 100 : 0;

                          const player1BestLeg = player1Stat.legDarts.length > 0 ? Math.min(...player1Stat.legDarts) : 0;
                          const player2BestLeg = player2Stat.legDarts.length > 0 ? Math.min(...player2Stat.legDarts) : 0;

                          const player1WorstLeg = player1Stat.legDarts.length > 0 ? Math.max(...player1Stat.legDarts) : 0;
                          const player2WorstLeg = player2Stat.legDarts.length > 0 ? Math.max(...player2Stat.legDarts) : 0;

                          const stats = [
                            { label: "3-dart gemiddeld", player1: player1Avg.toFixed(2), player2: player2Avg.toFixed(2) },
                            { label: "First 9 gemiddeld", player1: player1First9Avg.toFixed(2), player2: player2First9Avg.toFixed(2) },
                            { label: "Hoogste finish", player1: player1Stat.highestFinish.toString(), player2: player2Stat.highestFinish.toString() },
                            { label: "Hoogste score", player1: player1Stat.highestScore.toString(), player2: player2Stat.highestScore.toString() },
                            { label: "Beste leg", player1: player1BestLeg > 0 ? player1BestLeg.toString() : "-", player2: player2BestLeg > 0 ? player2BestLeg.toString() : "-" },
                            { label: "Slechtste leg", player1: player1WorstLeg > 0 ? player1WorstLeg.toString() : "-", player2: player2WorstLeg > 0 ? player2WorstLeg.toString() : "-" },
                            { label: "180's", player1: player1Stat.oneEighties.toString(), player2: player2Stat.oneEighties.toString() },
                            { label: "140+ scores", player1: player1Stat.scores140Plus.toString(), player2: player2Stat.scores140Plus.toString() },
                            { label: "100+ scores", player1: player1Stat.scores100Plus.toString(), player2: player2Stat.scores100Plus.toString() },
                            { label: "80+ scores", player1: player1Stat.scores80Plus.toString(), player2: player2Stat.scores80Plus.toString() },
                          ];

                          return stats.map((stat, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-[#E8F0FF]"}>
                              <td className="p-3 text-left font-semibold text-[#000000] border border-[#D0E0FF]">
                                {stat.player1}
                              </td>
                              <td className="p-3 text-center text-[#7E838F] border border-[#D0E0FF]">
                                {stat.label}
                              </td>
                              <td className="p-3 text-right font-semibold text-[#000000] border border-[#D0E0FF]">
                                {stat.player2}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleMenu}
                      className="flex-1 py-3 px-4 bg-white text-[#000000] rounded-xl font-semibold text-sm hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 border-2 border-[#0A294F]"
                    >
                      Terug naar menu
                    </button>
                    <button
                      onClick={() => {
                        setShowGameFinished(false);
                        router.push("/speel-501");
                      }}
                      className="flex-1 py-3 px-4 bg-[#28C7D8] text-white rounded-xl font-semibold text-sm hover:bg-[#22a8b7] active:scale-95 transition-all duration-150"
                    >
                      Nieuw spel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      }

      {/* Bust Popup */}
      {
        showBustPopup && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-[#0A294F] bg-opacity-40 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => {
                // Prevent closing without confirmation
              }}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <h2 className="text-[#000000] font-semibold text-xl mb-2">
                    Bust!
                  </h2>
                  <p className="text-[#7E838F] text-sm">
                    Deze score is niet mogelijk. De beurt gaat naar de volgende speler.
                  </p>
                </div>

                <button
                  onClick={confirmBust}
                  className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation"
                >
                  Bevestigen
                </button>
              </div>
            </div>
          </>
        )
      }

      {/* Invalid Score Popup */}
      {
        showInvalidScorePopup && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-[#0A294F] bg-opacity-40 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => {
                // Prevent closing without confirmation
              }}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <h2 className="text-[#000000] font-semibold text-xl mb-2">
                    Ongeldige score
                  </h2>
                  <p className="text-[#7E838F] text-sm">
                    De maximale score met 3 pijlen is 180. Voer een geldige score in.
                  </p>
                </div>

                <button
                  onClick={() => setShowInvalidScorePopup(false)}
                  className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
}

export default function Play501Game() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A294F]">
          <div className="text-white">Laden...</div>
        </div>
      }
    >
      <Play501GameContent />
    </Suspense>
  );
}





