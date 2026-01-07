"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  const [playerStats, setPlayerStats] = useState<Map<number, DartStats>>(new Map());
  const [gameId, setGameId] = useState<string>("");
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
  const [checkoutDarts, setCheckoutDarts] = useState<1 | 2 | 3 | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    score: number;
    currentState: PlayerGameState;
    updatedStates: PlayerGameState[];
    updatedStats: Map<number, DartStats>;
  } | null>(null);
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
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [showPermissionInstructions, setShowPermissionInstructions] = useState(false);
  const [shakeDetectionReady, setShakeDetectionReady] = useState(false);

  useEffect(() => {
    if (!searchParams) return;
    if (typeof window === "undefined") return;
    
    const playersParam = searchParams.get("players");
    const modeParam = searchParams.get("mode");
    const typeParam = searchParams.get("type");
    const targetParam = searchParams.get("target");
    const trackDoublesParam = searchParams.get("trackDoubles");

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

        // Initialize game states
        const initialStates: PlayerGameState[] = parsedPlayers.map(
          (player: Player) => ({
            player,
            score: 501,
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

        // Generate unique game ID
        setGameId(`game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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

    // Sla huidige state op in geschiedenis (voordat double checkout wordt verwerkt)
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

    const { score, currentState, updatedStates, updatedStats } = pendingDoubleCheckout;
    const updatedStatesCopy = [...updatedStates];
    const updatedStatsCopy = new Map(updatedStats);

    // Update stats met dubbel tracking
    const currentPlayerId = currentState.player.id;
    const currentPlayerStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();
    
    // doublesHit = 1 als de speler heeft uitgegooid (maar dat is hier niet het geval, dus 0)
    // doublesThrown = aantal pijlen op dubbel
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
  }, [pendingDoubleCheckout, doubleDarts, currentPlayerIndex, players.length, gameStates, playerStats, legStartingPlayerIndex, setStartingPlayerIndex]);

  const confirmCheckout = () => {
    if (!pendingCheckout || !checkoutDarts) return;

    const { score, currentState, updatedStates, updatedStats } = pendingCheckout;
    const updatedStatesCopy = [...updatedStates];
    const updatedStatsCopy = new Map(updatedStats);

    // Update stats met dubbel tracking als trackDoubles aan staat
    if (trackDoubles) {
      const currentPlayerId = currentState.player.id;
      const currentPlayerStat = updatedStatsCopy.get(currentPlayerId) || createInitialStats();
      
      // Bij uitgooien: doublesHit = 1 (de laatste pijl op dubbel), doublesThrown = checkoutDarts
      // Maar we moeten alleen de laatste pijl tellen als hit, de rest als thrown
      const updatedStat = registerDoubleAttempt(currentPlayerStat, checkoutDarts, 1);
      updatedStatsCopy.set(currentPlayerId, updatedStat);
    }

    // Leg gewonnen - verhoog legsWon voor de winnende speler
    const newLegsWon = currentState.legsWon + 1;
    updatedStatesCopy[currentPlayerIndex] = {
      ...currentState,
      score: 501, // Reset voor volgende leg
      totalScore: currentState.totalScore + score,
      totalDarts: currentState.totalDarts + checkoutDarts, // Totaal darts over hele spel
      dartsInCurrentLeg: 0, // Reset darts voor nieuwe leg
      lastScore: score,
      turns: 0, // Reset turns voor nieuwe leg
      legsWon: newLegsWon,
    };

    // Reset alle spelers' scores en darts voor nieuwe leg
    updatedStatesCopy.forEach((state, idx) => {
      if (idx !== currentPlayerIndex) {
        state.score = 501;
        state.dartsInCurrentLeg = 0; // Reset darts voor nieuwe leg
        state.turns = 0; // Reset turns voor nieuwe leg
      }
    });

    // Een set is best-of-5: eerste tot 3 legs wint de set
    const legsNeededForSet = 3;
    let setWon = false;
    let newSetStartingPlayerIndex = setStartingPlayerIndex;

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

    // Wissel startende speler voor de volgende leg
    const newLegStartingPlayerIndex = (legStartingPlayerIndex + 1) % players.length;
    setLegStartingPlayerIndex(newLegStartingPlayerIndex);

    // Check if game is won (bij beide modes: eerste tot X sets)
    const gameWon = updatedStatesCopy[currentPlayerIndex].setsWon >= target;

    if (gameWon) {
      // Game finished - save stats and show end screen
      setWinner(updatedStatesCopy[currentPlayerIndex]);
      finishGame(updatedStatesCopy, updatedStatsCopy);
      setShowGameFinished(true);
    } else if (setWon) {
      // Nieuwe set begint - start met de nieuwe set starting player
      setCurrentPlayerIndex(newSetStartingPlayerIndex);
    } else {
      // Nieuwe leg begint - start met de nieuwe leg starting player
      setCurrentPlayerIndex(newLegStartingPlayerIndex);
    }

    setGameStates(updatedStatesCopy);
    setPlayerStats(updatedStatsCopy);
    setShowCheckoutPopup(false);
    setPendingCheckout(null);
    setCheckoutDarts(null);
    setInputScore("");
  };

  const handleSubmit = useCallback(() => {
    if (!inputScore || inputScore === "0") return;

    const score = parseInt(inputScore);
    if (score < 0 || score > 180) {
      alert("Score moet tussen 0 en 180 zijn");
      return;
    }

    const currentState = gameStates[currentPlayerIndex];
    if (!currentState) return;

    const newScore = currentState.score - score;

    if (newScore < 0) {
      alert("Bust! Score te hoog");
      setInputScore("");
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
      // Uitgegooid - toon popup voor aantal pijlen
      setPendingCheckout({
        score,
        currentState,
        updatedStates,
        updatedStats,
      });
      setShowCheckoutPopup(true);
      setCheckoutDarts(null);
      setInputScore("");
      return;
    } else {
      // Check of dit een mogelijke finish was (maar niet uitgegooid)
      if (trackDoubles) {
        const checkoutInfo = calculateCheckoutInfo(newScore);
        if (checkoutInfo.isPossible && checkoutInfo.possibleDartsOnDouble.length > 0) {
          // Mogelijke finish - toon pop-up voor dubbel tracking
          setPendingDoubleCheckout({
            score,
            currentState,
            updatedStates,
            updatedStats,
            possibleDartsOnDouble: checkoutInfo.possibleDartsOnDouble,
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
        totalDarts: currentState.totalDarts + 3, // Totaal darts over hele spel
        dartsInCurrentLeg: currentState.dartsInCurrentLeg + 3, // Darts in huidige leg
        lastScore: score,
        turns: currentState.turns + 1,
      };
      setGameStates(updatedStates);
      setInputScore("");
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }
  }, [inputScore, gameStates, currentPlayerIndex, playerStats, players.length, legStartingPlayerIndex, setStartingPlayerIndex, trackDoubles]);

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

      // Negeer keyboard input als checkout popup of game finished screen open is
      if (showCheckoutPopup || showGameFinished) {
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
        // Roep handleSubmit direct aan
        if (inputScore && inputScore !== "0" && !showCheckoutPopup && !showGameFinished) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCheckoutPopup, showGameFinished, showDoublePopup, pendingDoubleCheckout, doubleDarts, inputScore, handleSubmit, confirmDoubleCheckout]);

  const finishGame = async (
    finalStates: PlayerGameState[],
    finalStats: Map<number, DartStats>
  ) => {
    // Only execute on client side
    if (typeof window === "undefined") return;

    try {
      // Save stats for each player
      const statsPromises = finalStates.map(async (state) => {
        const playerStat = finalStats.get(state.player.id);
        if (!playerStat) return;

        const finalStatsData = calculateFinalStats(playerStat, state.lastScore);

        const { error } = await supabase.from("dart_stats").insert({
          game_id: gameId,
          player_id: state.player.id,
          ...finalStatsData,
        });

        if (error) {
          console.error(`Error saving stats for player ${state.player.id}:`, error);
        }
      });

      await Promise.all(statsPromises);
      console.log("Game stats opgeslagen!");
    } catch (error) {
      console.error("Error saving game stats:", error);
    }
  };


  const handleUndoTurn = () => {
    // Ga terug naar de vorige state in de geschiedenis
    if (gameHistory.length > 0) {
      const previousState = gameHistory[gameHistory.length - 1];
      
      // Herstel de game states
      setGameStates(previousState.gameStates);
      
      // Herstel de player stats
      setPlayerStats(previousState.playerStats);
      
      // Herstel de current player index
      setCurrentPlayerIndex(previousState.currentPlayerIndex);
      
      // Herstel de starting player indices
      setLegStartingPlayerIndex(previousState.legStartingPlayerIndex);
      setSetStartingPlayerIndex(previousState.setStartingPlayerIndex);
      
      // Verwijder de laatste entry uit de geschiedenis
      setGameHistory(gameHistory.slice(0, -1));
      
      // Reset input en popups
      setInputScore("");
      setShowCheckoutPopup(false);
      setShowDoublePopup(false);
      setPendingCheckout(null);
      setPendingDoubleCheckout(null);
      setCheckoutDarts(null);
      setDoubleDarts(null);
      setShowGameFinished(false);
      setWinner(null);
    } else {
      // Geen geschiedenis, ga gewoon terug naar vorige speler
      if (currentPlayerIndex > 0) {
        setCurrentPlayerIndex(currentPlayerIndex - 1);
      } else {
        setCurrentPlayerIndex(players.length - 1);
      }
      setInputScore("");
    }
  };

  const handleMenu = () => {
    router.push("/speel-501");
  };

  const calculateAverage = (state: PlayerGameState): number => {
    if (state.turns === 0) return 0;
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
          score: 501,
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
    const spins = 5 + Math.random() * 5; // 5-10 spins
    const randomRotation = Math.random() * 360;
    const totalRotation = wheelRotation + (spins * 360) + randomRotation;
    setWheelRotation(totalRotation);

    setTimeout(() => {
      setWheelSpinning(false);
      // Calculate which player is selected based on final rotation
      // The pointer is at the top (0 degrees), so we need to account for the rotation
      const normalizedRotation = totalRotation % 360;
      const degreesPerPlayer = 360 / players.length;
      // Since the wheel rotates, we need to reverse the calculation
      // The selected player is the one at the top (0 degrees) after rotation
      let selectedIndex = Math.floor((360 - normalizedRotation) / degreesPerPlayer) % players.length;
      if (selectedIndex < 0) selectedIndex += players.length;
      
      const selectedPlayer = players[selectedIndex];
      const playerIndex = players.findIndex(p => p.id === selectedPlayer.id);
      
      // Reorder players so selected player is first
      const reorderedPlayers = [
        ...players.slice(playerIndex),
        ...players.slice(0, playerIndex)
      ];
      setPlayers(reorderedPlayers);
      
      // Reorder game states to match
      const reorderedStates = [
        ...gameStates.slice(playerIndex),
        ...gameStates.slice(0, playerIndex)
      ];
      setGameStates(reorderedStates);
      
      // Set the starting player (now at index 0 after reordering)
      setCurrentPlayerIndex(0);
      setLegStartingPlayerIndex(0);
      setSetStartingPlayerIndex(0);
      
      setShowStartPopup(false);
    }, 3000);
  }, [wheelSpinning, wheelRotation, players, gameStates]);

  const flipCoin = useCallback(() => {
    if (coinFlipping) return;
    setCoinFlipping(true);
    setCoinResult(null); // Reset result before flipping
    const result = Math.random() < 0.5 ? "heads" : "tails";
    
    // Calculate end rotation: start from current rotation, add 5 full rotations (1800deg)
    // plus the result offset (0deg for heads, 180deg for tails)
    // This ensures smooth transition to final position
    const baseRotations = 5; // 5 full rotations
    const baseDegrees = baseRotations * 360; // 1800deg
    const resultOffset = result === "heads" ? 0 : 180;
    const endRotation = coinRotation + baseDegrees + resultOffset;
    
    // Set the rotation immediately to start the animation
    setCoinRotation(endRotation);
    
    // After animation completes, set result and stop flipping
    setTimeout(() => {
      // Normalize rotation to 0-360 range for display
      const normalizedRotation = endRotation % 360;
      setCoinRotation(normalizedRotation);
      setCoinResult(result);
      setCoinFlipping(false);
      
      // Assign based on coin flip
      if (result === "heads") {
        setCurrentPlayerIndex(0);
        setLegStartingPlayerIndex(0);
        setSetStartingPlayerIndex(0);
      } else {
        setCurrentPlayerIndex(1);
        setLegStartingPlayerIndex(1);
        setSetStartingPlayerIndex(1);
      }
      
      setTimeout(() => {
        setShowStartPopup(false);
      }, 1500);
    }, 2000);
  }, [coinFlipping, coinRotation]);

  // Function to request device motion permission (must be called in user gesture context)
  const requestMotionPermission = async () => {
    if (typeof window === "undefined") {
      console.log("Window not available");
      return false;
    }
    
    // Check if page is loaded over HTTPS (required for iOS)
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("127.0.0.1")) {
      console.warn("Device motion requires HTTPS (or localhost)");
      alert("Voor schudden is een beveiligde verbinding (HTTPS) nodig. De app werkt nog steeds, maar schudden is niet beschikbaar.");
      return false;
    }
    
    if (typeof DeviceMotionEvent === "undefined") {
      console.log("DeviceMotionEvent not supported in this browser");
      return false;
    }

    console.log("Checking device motion permission...");
    console.log("User agent:", navigator.userAgent);
    console.log("Protocol:", window.location.protocol);
    
    const DeviceMotionEventWithPerm = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    // Check if permission request is available (iOS 13+)
    if (typeof DeviceMotionEventWithPerm.requestPermission === "function") {
      try {
        console.log("Permission request function found - requesting permission...");
        setShowPermissionInstructions(true);
        
        // Request permission - this should show a native popup on iOS
        const permission = await DeviceMotionEventWithPerm.requestPermission();
        
        console.log("Permission result received:", permission);
        setShowPermissionInstructions(false);
        
        if (permission === "granted") {
          console.log("Permission granted! Motion detection enabled.");
          setMotionPermissionGranted(true);
          return true;
        } else if (permission === "denied") {
          console.log("Permission denied by user");
          setMotionPermissionGranted(false);
          alert("Toestemming geweigerd. Je kunt nog steeds op de knop klikken om handmatig te flippen/draaien.\n\nOm schudden in te schakelen, ga naar Instellingen > Safari > Beweging en toegang tot beweging toestaan.");
          return false;
        } else {
          console.log("Permission prompt dismissed or not granted:", permission);
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
      console.log("No permission required for device motion - enabling directly");
      setMotionPermissionGranted(true);
      return true;
    }
  };

  // Reset states when startMethod changes or popup opens
  useEffect(() => {
    if (showStartPopup && startMethod) {
      // Reset spinning/flipping states when menu opens
      setWheelSpinning(false);
      setCoinFlipping(false);
      setCoinResult(null);
      setShakeDetectionReady(false);
      
      // Small delay before enabling shake detection to prevent accidental triggers
      const timer = setTimeout(() => {
        setShakeDetectionReady(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setShakeDetectionReady(false);
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
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      // Try accelerationIncludingGravity first (Android), then acceleration (iOS)
      let acceleration = event.accelerationIncludingGravity;
      if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
        acceleration = event.acceleration;
      }
      
      if (!acceleration) return;
      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;
      
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
        
        console.log("Shake detected!", { 
          totalDelta, 
          accelerationMagnitude, 
          threshold: shakeThreshold,
          deltaThreshold: deltaThreshold,
          platform: isIOS ? "iOS" : isAndroid ? "Android" : "Unknown",
          startMethod, 
          wheelSpinning, 
          coinFlipping,
          x, y, z
        });
        
        // Only trigger if shake detection is ready (prevents accidental triggers on menu open)
        if (shakeDetectionReady) {
          if (startMethod === "wheel" && !wheelSpinning) {
            console.log("Spinning wheel via shake");
            spinWheel();
          } else if (startMethod === "coin" && !coinFlipping && players.length === 2) {
            console.log("Flipping coin via shake");
            flipCoin();
          }
        }
      }
    };

    const setupDeviceMotion = async () => {
      if (listenerAdded) {
        console.log("Listener already added");
        return;
      }

      // Check if DeviceMotionEvent is available
      if (typeof DeviceMotionEvent === "undefined") {
        console.log("DeviceMotionEvent is not supported");
        return;
      }

      // For iOS 13+ and some browsers, we need to request permission
      const DeviceMotionEventWithPerm = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };

      try {
        // If permission is already granted (from button click), add listener directly
        if (motionPermissionGranted || typeof DeviceMotionEventWithPerm.requestPermission !== "function") {
          console.log("Adding device motion listener (permission already granted or not required)");
          window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
          listenerAdded = true;
          if (!motionPermissionGranted) {
            setMotionPermissionGranted(true);
          }
        } else {
          // Try to request permission (but this might not work if not in user gesture)
          console.log("Attempting to request permission in useEffect...");
          const permission = await DeviceMotionEventWithPerm.requestPermission();
          if (permission === "granted") {
            window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
            listenerAdded = true;
            setMotionPermissionGranted(true);
            console.log("Device motion permission granted and listener added");
          } else {
            console.log("Device motion permission denied in useEffect");
            setMotionPermissionGranted(false);
          }
        }
      } catch (error) {
        console.error("Error setting up device motion:", error);
        // Try to add listener anyway for browsers that don't require permission
        try {
          console.log("Trying to add listener without permission check...");
          window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
          listenerAdded = true;
          setMotionPermissionGranted(true);
          console.log("Device motion listener added (fallback)");
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
  }, [showStartPopup, startMethod, wheelSpinning, coinFlipping, players.length, flipCoin, spinWheel, motionPermissionGranted, shakeDetectionReady]);

  if (typeof window === "undefined" || players.length === 0 || gameStates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A294F]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  const isTwoPlayers = players.length === 2;

  // Start Popup
  if (showStartPopup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A294F] p-4">
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
                    console.log("Coin button clicked - requesting permission...");
                    const granted = await requestMotionPermission();
                    console.log("Permission result for coin:", granted);
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
                      className={`w-full py-3 px-4 rounded-lg text-left transition-all duration-150 ${
                        isSelected
                          ? "bg-[#0A294F] text-white"
                          : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{player.username}</span>
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
                    transform: `rotate(${wheelRotation}deg)`,
                    background: `conic-gradient(${players.map((_, i) => {
                      const colors = ["#28C7D8", "#E8F0FF", "#0A294F", "#D0E0FF", "#22a8b7", "#7E838F"];
                      return `${colors[i % colors.length]} ${(i / players.length) * 360}deg ${((i + 1) / players.length) * 360}deg`;
                    }).join(", ")})`,
                  }}
                />
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#0A294F]" />
                </div>
              </div>
              
              {/* Player names display box */}
              <div className="bg-[#E8F0FF] rounded-xl p-4 mb-4">
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold text-[#000000] mb-2">Spelers op het rad:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {players.map((player, i) => {
                      const colors = ["#28C7D8", "#E8F0FF", "#0A294F", "#D0E0FF", "#22a8b7", "#7E838F"];
                      const color = colors[i % colors.length];
                      return (
                        <div
                          key={player.id}
                          className="px-3 py-1 rounded-lg text-sm font-semibold"
                          style={{
                            backgroundColor: color,
                            color: color === "#0A294F" || color === "#7E838F" ? "white" : "#000000",
                          }}
                        >
                          {player.username}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                    transition: coinFlipping 
                      ? "transform 2s cubic-bezier(0.4, 0.0, 0.2, 1)" 
                      : "transform 0s",
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
                  <div className="text-sm font-bold text-[#000000]">
                    Sets: {gameStates[0].setsWon}
                  </div>
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
                  <div className="text-sm font-bold text-white">
                    Sets: {gameStates[1].setsWon}
                  </div>
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
                    <div
                      className={`text-xs font-bold ${index % 2 === 0 ? "text-[#000000]" : "text-white"
                        }`}
                    >
                      Sets: {state.setsWon}
                    </div>
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

      {/* Checkout Popup */}
      {showCheckoutPopup && (
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
                  Uitgegooid!
                </h2>
                <p className="text-[#7E838F] text-sm">
                  Met hoeveel pijlen ben je uitgegooid?
                </p>
              </div>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setCheckoutDarts(1)}
                  className={`flex-1 py-4 px-4 rounded-xl font-semibold text-lg transition-all duration-150 ${
                    checkoutDarts === 1
                      ? "bg-[#0A294F] text-[#E8F0FF]"
                      : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCheckoutDarts(2)}
                  className={`flex-1 py-4 px-4 rounded-xl font-semibold text-lg transition-all duration-150 ${
                    checkoutDarts === 2
                      ? "bg-[#0A294F] text-[#E8F0FF]"
                      : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setCheckoutDarts(3)}
                  className={`flex-1 py-4 px-4 rounded-xl font-semibold text-lg transition-all duration-150 ${
                    checkoutDarts === 3
                      ? "bg-[#0A294F] text-[#E8F0FF]"
                      : "bg-white text-[#000000] border-2 border-[#0A294F] hover:bg-[#D0E0FF]"
                  }`}
                >
                  3
                </button>
              </div>

              <button
                onClick={confirmCheckout}
                disabled={!checkoutDarts}
                className="w-full py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Double Checkout Popup */}
      {showDoublePopup && pendingDoubleCheckout && (
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
                  Mogelijke finish
                </h2>
                <p className="text-[#7E838F] text-sm mb-2">
                  Je staat op {pendingDoubleCheckout.currentState.score - pendingDoubleCheckout.score}
                </p>
                <p className="text-[#7E838F] text-sm">
                  Hoeveel pijlen heb je op een dubbel gegooid?
                </p>
              </div>

              <div className="flex gap-3 mb-6 justify-center">
                {pendingDoubleCheckout.possibleDartsOnDouble
                  .sort((a, b) => a - b)
                  .map((num) => (
                    <button
                      key={num}
                      onClick={() => setDoubleDarts(num)}
                      className={`w-20 py-4 px-4 rounded-xl font-semibold text-lg transition-all duration-150 ${
                        doubleDarts === num
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
      )}

      {/* Game Finished Screen */}
      {showGameFinished && winner && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-[#0A294F] bg-opacity-90 backdrop-blur-sm z-50 transition-opacity duration-300" />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-4xl my-8">
              {/* Winnaar header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-[#000000] mb-2">
                  🎯 {winner.player.username} heeft gewonnen! 🎯
                </h1>
                <p className="text-[#7E838F] text-sm">
                  {winner.setsWon} - {gameStates.find(s => s.player.id !== winner.player.id)?.setsWon || 0} Sets
                </p>
              </div>

              {/* Statistieken grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Speler 1 statistieken */}
                {gameStates.map((state, idx) => {
                  const playerStat = playerStats.get(state.player.id) || createInitialStats();
                  const avg = state.totalDarts > 0 ? Math.round((state.totalScore / state.totalDarts) * 3 * 100) / 100 : 0;

                  return (
                    <div
                      key={state.player.id}
                      className={`rounded-xl p-4 ${
                        idx === 0
                          ? "bg-[#28C7D8] text-white"
                          : "bg-white text-[#000000]"
                      }`}
                    >
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-lg mb-1">
                          {state.player.username}
                        </h3>
                        {state.player.id === winner.player.id && (
                          <span className="text-xs font-semibold">🏆 Winnaar</span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-80">Sets:</span>
                          <span className="font-bold">{state.setsWon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Legs:</span>
                          <span className="font-bold">{state.legsWon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">3-dart avg:</span>
                          <span className="font-bold">{avg.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Totaal darts:</span>
                          <span className="font-bold">{state.totalDarts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">180&apos;s:</span>
                          <span className="font-bold">{playerStat.oneEighties}</span>
                        </div>
                        {trackDoubles && (
                          <div className="flex justify-between">
                            <span className="opacity-80">Dubbel%:</span>
                            <span className="font-bold">
                              {playerStat.doublesThrown > 0
                                ? ((playerStat.doublesHit / playerStat.doublesThrown) * 100).toFixed(1)
                                : "0.0"}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Midden: Algemene statistieken */}
                <div className="rounded-xl p-4 bg-[#0A294F] text-white">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg mb-1">Algemene Statistieken</h3>
                  </div>

                  <div className="space-y-2 text-sm">
                    {gameStates.map((state) => {
                      const playerStat = playerStats.get(state.player.id) || createInitialStats();
                      const first9Avg = playerStat.first9Turns > 0 ? Math.round((playerStat.first9Score / playerStat.first9Turns) * 100) / 100 : 0;
                      const threeDartAvg = playerStat.totalTurns > 0 ? Math.round((playerStat.totalScore / playerStat.totalTurns) * 100) / 100 : 0;

                      return (
                        <div key={state.player.id} className="mb-3">
                          <div className="font-semibold mb-1">{state.player.username}:</div>
                          <div className="space-y-1 text-xs opacity-90">
                            <div className="flex justify-between">
                              <span>First 9 avg:</span>
                              <span>{first9Avg.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>3-dart avg:</span>
                              <span>{threeDartAvg.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Beurten:</span>
                              <span>{playerStat.totalTurns}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Totaal score:</span>
                              <span>{playerStat.totalScore}</span>
                            </div>
                            {trackDoubles && (
                              <>
                                <div className="flex justify-between">
                                  <span>Doubles geraakt:</span>
                                  <span>{playerStat.doublesHit}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Doubles gegooid:</span>
                                  <span>{playerStat.doublesThrown}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Dubbelpercentage:</span>
                                  <span>
                                    {playerStat.doublesThrown > 0
                                      ? ((playerStat.doublesHit / playerStat.doublesThrown) * 100).toFixed(1)
                                      : "0.0"}%
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
        </>
      )}
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
