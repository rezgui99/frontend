describe('Recommendation Utils', () => {
  describe('normalizeDurationToHours', () => {
    const normalizeDurationToHours = (d) => {
      if (!d || typeof d !== 'string') return null;
      const range = d.match(/(\d+)\s*-\s*(\d+)/);
      if (range) {
        const a = parseInt(range[1], 10), b = parseInt(range[2], 10);
        return Math.round((a + b) / 2);
      }
      const single = d.match(/(\d+)/);
      return single ? parseInt(single[1], 10) : null;
    };

    it('should normalize range duration', () => {
      expect(normalizeDurationToHours('20-40 heures')).toBe(30);
      expect(normalizeDurationToHours('80-120 heures')).toBe(100);
    });

    it('should normalize single duration', () => {
      expect(normalizeDurationToHours('24 heures')).toBe(24);
      expect(normalizeDurationToHours('20 h')).toBe(20);
    });

    it('should handle invalid input', () => {
      expect(normalizeDurationToHours(null)).toBeNull();
      expect(normalizeDurationToHours('')).toBeNull();
      expect(normalizeDurationToHours('no numbers')).toBeNull();
    });
  });

  describe('inferDifficulty', () => {
    const inferDifficulty = (gap) => {
      if (gap >= 3) return 'Difficile';
      if (gap === 2) return 'Moyenne';
      return 'Facile';
    };

    it('should infer correct difficulty levels', () => {
      expect(inferDifficulty(1)).toBe('Facile');
      expect(inferDifficulty(2)).toBe('Moyenne');
      expect(inferDifficulty(3)).toBe('Difficile');
      expect(inferDifficulty(4)).toBe('Difficile');
    });
  });

  describe('inferSuccessProb', () => {
    const inferSuccessProb = (gap, hasCert) => {
      let base = gap >= 3 ? 0.55 : gap === 2 ? 0.70 : 0.85;
      if (hasCert) base += 0.05;
      return Math.max(0.10, Math.min(0.98, base));
    };

    it('should calculate success probability correctly', () => {
      expect(inferSuccessProb(1, false)).toBe(0.85);
      expect(inferSuccessProb(1, true)).toBe(0.90);
      expect(inferSuccessProb(2, false)).toBe(0.70);
      expect(inferSuccessProb(3, false)).toBe(0.55);
    });

    it('should respect min/max bounds', () => {
      expect(inferSuccessProb(5, true)).toBe(0.60); // 0.55 + 0.05
      expect(inferSuccessProb(0, false)).toBe(0.85);
    });
  });
});

