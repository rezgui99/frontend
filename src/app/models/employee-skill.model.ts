export interface EmployeeSkill {
  employee_id: number;
  skill_id: number;
  actual_skill_level_id?: number;
  acquired_date?: string; // ou Date
  last_evaluated_date?: string; // ou Date
  certification?: string;

  // Relations pour afficher les noms si besoin
  Employee?: { name: string };
  Skill?: { name: string };
  SkillLevel?: { name: string };
}
