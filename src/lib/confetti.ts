/**
 * Dynamic confetti import — lazy-loads canvas-confetti only when needed.
 * Saves ~15KB from initial bundle on bill pages that don't trigger confetti.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let confettiModule: any = null;

async function getConfetti() {
  if (!confettiModule) {
    const mod = await import('canvas-confetti');
    confettiModule = mod.default;
  }
  return confettiModule as (opts: Record<string, unknown>) => void;
}

/** Trigger haptic feedback if available (mobile devices) */
function haptic(pattern: number | number[] = 10) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silent fail — vibration API not available
  }
}

/** 🎉 Bill creation celebration */
export async function celebrateCreation() {
  haptic(15);
  const confetti = await getConfetti();
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#22C55E'],
  });
}

/** 🎊 Contribution success — lighter celebration */
export async function celebrateContribution() {
  haptic([10, 30, 10]);
  const confetti = await getConfetti();
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.7 },
    colors: ['#22C55E', '#4ADE80', '#86EFAC', '#F59E0B', '#FBBF24'],
  });
}

/** 🏆 Full settlement — premium multi-burst celebration */
export async function celebrateSettlement() {
  haptic([10, 50, 10, 50, 10]);
  const confetti = await getConfetti();

  // Main burst
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#E67E22', '#f59e0b', '#fbbf24', '#d97706', '#FFD700', '#FFA500'],
    ticks: 200,
  });

  // Side bursts
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 65,
      origin: { x: 0 },
      colors: ['#E67E22', '#FFD700', '#fbbf24', '#2ECC71'],
      ticks: 200,
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 65,
      origin: { x: 1 },
      colors: ['#E67E22', '#FFD700', '#fbbf24', '#2ECC71'],
      ticks: 200,
    });
  }, 300);

  // Final sparkle
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#FFD700', '#A29BFE', '#2ECC71'],
      ticks: 150,
      scalar: 0.8,
    });
  }, 600);
}
