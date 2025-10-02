const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateAnalyticsReport(analyticsData) {
    try {
      const prompt = this.buildAnalyticsPrompt(analyticsData);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('Erreur génération rapport Gemini:', error);
      throw new Error('Impossible de générer le rapport avec l\'IA');
    }
  }

  buildAnalyticsPrompt(data) {
    return `
# Analyse RH Approfondie - Rapport Exécutif

Générez un rapport d'analyse RH professionnel et détaillé basé sur les données suivantes :

## Données d'entrée :
- Employés totaux: ${data.totalEmployees}
- Offres d'emploi: ${data.totalJobOffers}  
- Taux de succès global: ${data.overallSuccessRate}%
- Départements analysés: ${data.departments?.length || 0}
- Compétences en demande: ${data.skillsDemand?.length || 0}

## Statistiques par département:
${data.departmentStats?.map(dept => 
  `- ${dept.department}: ${dept.total_applications} candidatures, ${dept.success_rate}% succès`
).join('\n') || 'Aucune donnée'}

## Top compétences demandées:
${data.skillsDemand?.slice(0, 10).map((skill, index) => 
  `${index + 1}. ${skill.skill_name}: ${skill.demand_count} demandes`
).join('\n') || 'Aucune donnée'}

## Consignes pour le rapport:

1. **Résumé Exécutif** (2-3 paragraphes)
   - Vue d'ensemble de la situation RH
   - Points clés et tendances principales

2. **Analyse Détaillée**
   - Performance par département avec insights
   - Analyse des compétences critiques
   - Identification des goulots d'étranglement

3. **Recommandations Stratégiques**
   - Actions prioritaires pour améliorer les performances
   - Stratégies de développement des compétences
   - Optimisation des processus de recrutement

4. **Prédictions et Tendances**
   - Évolution attendue du marché des compétences
   - Besoins futurs en recrutement
   - Risques et opportunités identifiés

5. **Plan d'Action**
   - Étapes concrètes à court terme (0-3 mois)
   - Objectifs à moyen terme (3-12 mois)
   - Vision long terme (1-3 ans)

Le rapport doit être professionnel, basé sur les données, avec des recommandations actionables et des métriques spécifiques.
Format: Markdown avec sections bien structurées.
Longueur: 1500-2500 mots environ.
`;
  }

  async generateEmployeeRecommendations(employeeData) {
    try {
      const prompt = `
Générez des recommandations personnalisées pour l'employé suivant :

Nom: ${employeeData.employee_name}
Poste: ${employeeData.current_position}
Compétences actuelles: ${employeeData.recommendations?.length || 0} recommandations
Score de développement: ${employeeData.overall_development_score}/100

Recommandations détectées:
${employeeData.recommendations?.map(rec => 
  `- ${rec.skill_name}: Niveau ${rec.current_level} → ${rec.recommended_level} (Priorité: ${rec.priority_score})`
).join('\n') || 'Aucune'}

Opportunités de carrière:
${employeeData.career_opportunities?.map(opp => 
  `- ${opp.job_title} (${opp.department}): ${opp.compatibility_score}% compatible`
).join('\n') || 'Aucune'}

Créez un plan de développement personnalisé avec:
1. Analyse des forces et axes d'amélioration
2. Plan de formation prioritaire
3. Objectifs de carrière recommandés
4. Timeline de développement
5. Ressources et formations suggérées

Format: Markdown structuré, 800-1200 mots.
`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Erreur recommandations Gemini:', error);
      throw new Error('Impossible de générer les recommandations avec l\'IA');
    }
  }
}

module.exports = new GeminiService();