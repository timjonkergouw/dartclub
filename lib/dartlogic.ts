export type DartStats = {
    totalScore: number;
    totalTurns: number;

    first9Score: number;
    first9Turns: number;

    doublesHit: number;
    doublesThrown: number;

    oneEighties: number;
    
    highestScore: number;
    highestFinish: number;
    scores140Plus: number;
    scores100Plus: number;
    scores80Plus: number;
    legDarts: number[]; // Array van darts per leg voor beste/slechtste leg berekening
};

export const createInitialStats = (): DartStats => ({
    totalScore: 0,
    totalTurns: 0,

    first9Score: 0,
    first9Turns: 0,

    doublesHit: 0,
    doublesThrown: 0,

    oneEighties: 0,
    
    highestScore: 0,
    highestFinish: 0,
    scores140Plus: 0,
    scores100Plus: 0,
    scores80Plus: 0,
    legDarts: [],
});


/// voor een beurt ///
export const registerTurn = (
    stats: DartStats,
    turnScore: number
): DartStats => {
    const updated = { ...stats };

    updated.totalScore += turnScore;
    updated.totalTurns++;

    if (updated.totalTurns <= 3) {
        updated.first9Score += turnScore;
        updated.first9Turns++;
    }

    if (turnScore === 180) {
        updated.oneEighties++;
    }

    // Track highest score
    if (turnScore > updated.highestScore) {
        updated.highestScore = turnScore;
    }

    // Track score ranges
    // 140+: 140-179
    if (turnScore >= 140 && turnScore < 180) {
        updated.scores140Plus++;
    }
    // 100+: 100-139
    if (turnScore >= 100 && turnScore < 140) {
        updated.scores100Plus++;
    }
    // 80+: 80-99
    if (turnScore >= 80 && turnScore < 100) {
        updated.scores80Plus++;
    }

    return updated;
};

/// registreer dubbel poging ///
export const registerDoubleAttempt = (
    stats: DartStats,
    dartsOnDouble: number,
    doublesHit: number
): DartStats => {
    const updated = { ...stats };
    updated.doublesThrown += dartsOnDouble;
    updated.doublesHit += doublesHit;
    return updated;
};

/// finish ///

export const calculateFinalStats = (
    stats: DartStats,
    finishScore: number
) => {
    return {
        three_dart_avg: stats.totalTurns > 0 ? stats.totalScore / stats.totalTurns : 0,
        first9_avg: stats.first9Turns > 0 ? stats.first9Score / stats.first9Turns : 0,
        finish: finishScore,
        doubles_hit: stats.doublesHit,
        doubles_thrown: stats.doublesThrown,
        one_eighties: stats.oneEighties,
    };
};
