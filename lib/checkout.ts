/**
 * Checkout calculator voor 501 darts
 * Bepaalt hoeveel pijlen op dubbel mogelijk zijn bij een finish
 */

export interface CheckoutInfo {
  isPossible: boolean;
  possibleDartsOnDouble: number[]; // Mogelijke aantal pijlen op dubbel (1, 2, of 3)
  minDartsOnDouble: number; // Minimum aantal pijlen op dubbel
  maxDartsOnDouble: number; // Maximum aantal pijlen op dubbel
}

/**
 * Bepaalt of een score een mogelijke finish is
 * en hoeveel pijlen op dubbel mogelijk zijn
 */
export function calculateCheckoutInfo(score: number): CheckoutInfo {
  // Score moet tussen 2 en 170 zijn voor een mogelijke finish
  if (score < 2 || score > 170) {
    return {
      isPossible: false,
      possibleDartsOnDouble: [],
      minDartsOnDouble: 0,
      maxDartsOnDouble: 0,
    };
  }

  // Ongeldige scores (oneven getallen > 1)
  if (score > 1 && score % 2 === 1) {
    return {
      isPossible: false,
      possibleDartsOnDouble: [],
      minDartsOnDouble: 0,
      maxDartsOnDouble: 0,
    };
  }

  const possibleDartsOnDouble = new Set<number>();

  // Mogelijke scores per dart: 1-20 (single), 21-40 (double), 22-60 (triple), 25 (bull), 50 (bullseye)
  const possibleScores = [];
  for (let i = 1; i <= 20; i++) {
    possibleScores.push(i); // Single
    possibleScores.push(i * 2); // Double
    possibleScores.push(i * 3); // Triple
  }
  possibleScores.push(25); // Bull
  possibleScores.push(50); // Bullseye

  // 1 dart finish (alleen dubbel mogelijk)
  if (score <= 40 && score % 2 === 0) {
    possibleDartsOnDouble.add(1);
  }

  // 2 dart finishes
  if (score <= 100) {
    for (const first of possibleScores) {
      if (first > score) continue;
      const remaining = score - first;
      if (remaining > 0 && remaining <= 40 && remaining % 2 === 0) {
        // Als de eerste pijl een dubbel is, dan zijn er 2 pijlen op dubbel
        // Als de eerste pijl geen dubbel is, dan is alleen de laatste pijl op dubbel (1 pijl)
        if (first % 2 === 0 && first <= 40) {
          possibleDartsOnDouble.add(2);
        } else {
          possibleDartsOnDouble.add(1);
        }
      }
    }
  }

  // 3 dart finishes
  if (score <= 170) {
    for (const first of possibleScores) {
      if (first > score) continue;
      for (const second of possibleScores) {
        if (first + second > score) continue;
        const remaining = score - first - second;
        if (remaining > 0 && remaining <= 40 && remaining % 2 === 0) {
          let dartsOnDouble = 1; // De laatste pijl is altijd op dubbel
          if (first % 2 === 0 && first <= 40) dartsOnDouble++;
          if (second % 2 === 0 && second <= 40) dartsOnDouble++;
          possibleDartsOnDouble.add(dartsOnDouble);
        }
      }
    }
  }

  const possibleArray = Array.from(possibleDartsOnDouble).sort();

  return {
    isPossible: possibleArray.length > 0,
    possibleDartsOnDouble: possibleArray,
    minDartsOnDouble: possibleArray.length > 0 ? Math.min(...possibleArray) : 0,
    maxDartsOnDouble: possibleArray.length > 0 ? Math.max(...possibleArray) : 0,
  };
}

/**
 * Bepaalt hoeveel pijlen op dubbel minimaal nodig zijn voor een finish
 * Dit is gebaseerd op de checkout logica
 */
export function getMinDartsOnDouble(score: number): number {
  const info = calculateCheckoutInfo(score);
  
  if (!info.isPossible) {
    return 0;
  }

  // Voor scores <= 40: altijd 1 pijl op dubbel mogelijk
  if (score <= 40 && score % 2 === 0) {
    return 1;
  }

  // Voor scores 42-100: minimaal 2 pijlen op dubbel mogelijk
  if (score <= 100) {
    return 2;
  }

  // Voor scores > 100: minimaal 3 pijlen op dubbel nodig
  return 3;
}

/**
 * Bepaalt hoeveel pijlen op dubbel maximaal mogelijk zijn voor een finish
 */
export function getMaxDartsOnDouble(score: number): number {
  const info = calculateCheckoutInfo(score);
  return info.maxDartsOnDouble;
}

