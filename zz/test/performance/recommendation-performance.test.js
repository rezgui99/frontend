describe('Recommendation Performance Tests', () => {
  it('should process job recommendations within acceptable time', async () => {
    const startTime = process.hrtime();
    
    // Simuler un appel de recommandation avec beaucoup de données
    const largeEmployeeData = {
      id: 1,
      name: 'Test Employee',
      skills: Array.from({ length: 50 }, (_, i) => ({
        skill_id: i + 1,
        skill_name: `Skill ${i + 1}`,
        level_value: Math.floor(Math.random() * 5) + 1
      }))
    };

    const largeJobsData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      title: `Job ${i + 1}`,
      required_skills: Array.from({ length: 10 }, (_, j) => ({
        skill_id: j + 1,
        required_level_value: Math.floor(Math.random() * 5) + 1
      }))
    }));

    // Test avec le fallback local
    const RecommendationService = require('../../src/services/recommendationService');
    const result = RecommendationService.localJobFallback(
      largeEmployeeData,
      largeJobsData,
      { maxRecommendations: 10, minCompatibilityScore: 0.5 }
    );

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000; // en millisecondes

    expect(executionTime).toBeLessThan(1000); // Moins d'1 seconde
    expect(result).toHaveLength(10); // Limite respectée
  });

  it('should handle large skill gap calculations efficiently', () => {
    const startTime = process.hrtime();
    
    // Test avec beaucoup de calculs de gaps
    const calculations = 10000;
    for (let i = 0; i < calculations; i++) {
      const employeeLevel = Math.floor(Math.random() * 5) + 1;
      const requiredLevel = Math.floor(Math.random() * 5) + 1;
      const gap = Math.max(0, requiredLevel - employeeLevel);
      const compatibility = employeeLevel >= requiredLevel ? 1 : employeeLevel / requiredLevel;
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000;

    expect(executionTime).toBeLessThan(100); // Moins de 100ms pour 10k calculs
  });
});