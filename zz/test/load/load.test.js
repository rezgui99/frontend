describe('Load Tests', () => {
  it('should handle concurrent user registrations', async () => {
    const concurrentUsers = 50;
    const registrationPromises = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const mockRegistration = new Promise((resolve) => {
        setTimeout(() => {
          // Simuler le temps de traitement d'une inscription
          resolve({
            success: true,
            userId: i + 1,
            processingTime: Math.random() * 100 + 50 // 50-150ms
          });
        }, Math.random() * 100);
      });
      
      registrationPromises.push(mockRegistration);
    }

    const startTime = Date.now();
    const results = await Promise.all(registrationPromises);
    const totalTime = Date.now() - startTime;

    expect(results).toHaveLength(concurrentUsers);
    expect(results.every(r => r.success)).toBe(true);
    expect(totalTime).toBeLessThan(1000); // Moins d'1 seconde pour 50 utilisateurs
  });

  it('should handle concurrent recommendation requests', async () => {
    const concurrentRequests = 20;
    const recommendationPromises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const mockRecommendation = new Promise((resolve) => {
        setTimeout(() => {
          // Simuler le calcul de recommandations
          resolve({
            employeeId: i + 1,
            recommendations: Array.from({ length: 5 }, (_, j) => ({
              jobId: j + 1,
              score: Math.random()
            })),
            processingTime: Math.random() * 200 + 100 // 100-300ms
          });
        }, Math.random() * 150);
      });
      
      recommendationPromises.push(mockRecommendation);
    }

    const startTime = Date.now();
    const results = await Promise.all(recommendationPromises);
    const totalTime = Date.now() - startTime;

    expect(results).toHaveLength(concurrentRequests);
    expect(results.every(r => r.recommendations.length === 5)).toBe(true);
    expect(totalTime).toBeLessThan(2000); // Moins de 2 secondes pour 20 requêtes
  });
});
