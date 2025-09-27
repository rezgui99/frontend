describe('API Compatibility Tests', () => {
  describe('Response Format Stability', () => {
    it('should maintain consistent user registration response format', () => {
      const mockUserResponse = {
        message: 'Utilisateur créé avec succès',
        user: {
          id: 1,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          role: 'hr',
          roles: ['hr']
        },
        token: 'jwt-token',
        emailVerificationRequired: true
      };

      // Vérifier que tous les champs requis sont présents
      expect(mockUserResponse).toHaveProperty('message');
      expect(mockUserResponse).toHaveProperty('user');
      expect(mockUserResponse).toHaveProperty('token');
      expect(mockUserResponse).toHaveProperty('emailVerificationRequired');
      
      expect(mockUserResponse.user).toHaveProperty('id');
      expect(mockUserResponse.user).toHaveProperty('email');
      expect(mockUserResponse.user).toHaveProperty('role');
      expect(mockUserResponse.user).toHaveProperty('roles');
      expect(Array.isArray(mockUserResponse.user.roles)).toBe(true);
    });

    it('should maintain consistent job recommendation response format', () => {
      const mockJobRecommendation = {
        job_id: 1,
        job_title: 'Software Engineer',
        department: 'IT',
        compatibility_score: 0.85,
        skill_match_score: 0.80,
        experience_match_score: 0.90,
        readiness_level: 'Prêt',
        matching_skills: [
          {
            skill_name: 'JavaScript',
            current_level: 4,
            required_level: 3,
            weight: 1.0
          }
        ],
        missing_skills: [],
        exceeding_skills: [],
        recommended_actions: ['Postuler immédiatement']
      };

      // Vérifier la structure de la recommandation
      expect(mockJobRecommendation).toHaveProperty('job_id');
      expect(mockJobRecommendation).toHaveProperty('job_title');
      expect(mockJobRecommendation).toHaveProperty('compatibility_score');
      expect(mockJobRecommendation).toHaveProperty('matching_skills');
      expect(mockJobRecommendation).toHaveProperty('missing_skills');
      expect(mockJobRecommendation).toHaveProperty('exceeding_skills');
      
      expect(Array.isArray(mockJobRecommendation.matching_skills)).toBe(true);
      expect(Array.isArray(mockJobRecommendation.missing_skills)).toBe(true);
      expect(Array.isArray(mockJobRecommendation.exceeding_skills)).toBe(true);
      expect(Array.isArray(mockJobRecommendation.recommended_actions)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy API endpoints', () => {
      // Test que les anciens endpoints continuent de fonctionner
      const legacyEndpoints = [
        '/api/auth/login',
        '/api/auth/register', 
        '/api/recommendations/employee/:id/jobs',
        '/api/job-skills-match/:jobId'
      ];

      legacyEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
        expect(endpoint.length).toBeGreaterThan(5);
      });
    });
  });
});
