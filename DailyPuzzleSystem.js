/**
 * DailyPuzzleSystem
 * 
 * Generates deterministic daily puzzles based on local user time.
 * - Uses seeded PRNG (Mulberry32) for deterministic code generation
 * - Derives puzzle date from user's local midnight
 * - Supports both duplicates and no-duplicates modes
 * - Zero external dependencies
 */

const DailyPuzzleSystem = (() => {
  // Configuration
  const LAUNCH_DATE = new Date(2026, 2, 21); // March 21, 2026 (months are 0-indexed)
  const COLOR_IDS = [1, 2, 3, 4, 5, 6];

  /**
   * Mulberry32 PRNG
   * A simple, fast, deterministic seeded random number generator.
   * Seed must be a non-zero 32-bit integer.
   * Returns values in [0, 1).
   * 
   * Reference: https://stackoverflow.com/a/47593316
   */
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Convert string to integer seed
   * Ensures deterministic seed from string input
   */
  function stringToSeed(str) {
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      seed = ((seed << 5) - seed) + char;
      seed = seed & seed; // Convert to 32-bit integer
    }
    return seed === 0 ? 1 : Math.abs(seed); // Ensure non-zero
  }

  /**
   * Get local date in YYYYMMDD format
   * Uses user's local time zone (not UTC)
   */
  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Get local date as Date object (at midnight)
   */
  function getLocalMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Calculate puzzle number based on days elapsed since launch
   * Uses local user time (not UTC)
   */
  function calculatePuzzleNumber() {
    const today = getLocalMidnight();
    const launchMidnight = new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
    
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((today - launchMidnight) / msPerDay);
    
    return Math.max(1, daysDiff + 1); // Start at puzzle #1
  }

  /**
   * Generate a 4-color code for a given mode
   * allowDuplicates: false = 4 unique colors, true = colors can repeat
   */
  function generateCode(seed, allowDuplicates) {
    const rng = mulberry32(seed);
    const colors = [...COLOR_IDS];
    const result = [];

    if (allowDuplicates) {
      // Random selection with replacement
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rng() * 6);
        result.push(colors[idx]);
      }
    } else {
      // Fisher-Yates shuffle, then take first 4
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }
      result.push(...colors.slice(0, 4));
    }

    return result;
  }

  /**
   * Get today's daily puzzle
   * Returns { code, puzzleNumber, mode, dateString }
   */
  function getTodaysPuzzle(mode = 'nodup') {
    const dateString = getLocalDateString();
    const seedSuffix = mode === 'dup' ? 'D' : 'N';
    const seedString = `${dateString}${seedSuffix}`;
    const seed = stringToSeed(seedString);

    const allowDuplicates = mode === 'dup';
    const code = generateCode(seed, allowDuplicates);
    const puzzleNumber = calculatePuzzleNumber();

    return {
      code,
      puzzleNumber,
      mode,
      dateString,
      seed: seedString // For debugging/verification
    };
  }

  /**
   * Get a puzzle for a specific local date
   * date: Date object (will extract local date)
   * mode: 'dup' or 'nodup'
   * 
   * SECURITY: Only allows access to today or past dates.
   * Future dates are rejected to prevent spoilers.
   */
  function getPuzzleForDate(date, mode = 'nodup') {
    // Validate: no future dates allowed
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (targetDate > today) {
      throw new Error(`Cannot access future puzzle. Date requested: ${targetDate.toLocaleDateString()}, Today: ${today.toLocaleDateString()}`);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    const seedSuffix = mode === 'dup' ? 'D' : 'N';
    const seedString = `${dateString}${seedSuffix}`;
    const seed = stringToSeed(seedString);

    const allowDuplicates = mode === 'dup';
    const code = generateCode(seed, allowDuplicates);

    // Calculate puzzle number for this specific date
    const targetMidnight = new Date(year, date.getMonth(), day);
    const launchMidnight = new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((targetMidnight - launchMidnight) / msPerDay);
    const puzzleNumber = Math.max(1, daysDiff + 1);

    return {
      code,
      puzzleNumber,
      mode,
      dateString,
      seed: seedString
    };
  }

  /**
   * Public API
   */
  return {
    getTodaysPuzzle,
    getPuzzleForDate,
    calculatePuzzleNumber,
    getLocalDateString,
    
    // Expose for testing
    _mulberry32: mulberry32,
    _stringToSeed: stringToSeed,
    _generateCode: generateCode,
    _LAUNCH_DATE: LAUNCH_DATE,
    _COLOR_IDS: COLOR_IDS
  };
})();

// Export for Node.js/testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DailyPuzzleSystem;
}
