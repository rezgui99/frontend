import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmployeeSkillService } from '../../services/employee-skill.service';
import { EmployeeService, Employee } from '../../services/employee.service';
import { SkillService, Skill, SkillLevel } from '../../services/skill.service';
import { EmployeeSkill } from '../../models/employee-skill.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-employee-skills',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-skills.component.html',
  styleUrls: ['./employee-skills.component.css']
})
export class EmployeeSkillsComponent implements OnInit {
  skills: EmployeeSkill[] = [];
  employees: Employee[] = [];
  skillsList: Skill[] = [];
  skillLevels: SkillLevel[] = [];
  skillForm: FormGroup;
  showAddForm: boolean = false;
  editingSkill: EmployeeSkill | null = null;
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private skillService: EmployeeSkillService,
    private employeeService: EmployeeService,
    private skillMetaService: SkillService,
    private fb: FormBuilder
  ) {
    this.skillForm = this.fb.group({
      employee_id: ['', Validators.required],
      skill_id: ['', Validators.required],
      actual_skill_level_id: [null, Validators.required], // objet SkillLevel complet
      acquired_date: ['', Validators.required],
      certification: [''],
      last_evaluated_date: ['']
    });
  }

  ngOnInit(): void {
    this.loadSkillLevels(); // Charger les niveaux en premier pour associer ensuite
    this.loadEmployees();
    this.loadSkillList();
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading = true;
    this.errorMessage = null;
    this.skillService.getAll().subscribe({
      next: (data: EmployeeSkill[]) => {
        this.skills = data.map(s => ({
          ...s,
          SkillLevel: this.skillLevels.find(l => l.id === s.actual_skill_level_id) // undefined si non trouvé
        }));
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = err?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe({
      next: (data: Employee[]) => this.employees = data,
      error: (err: any) => console.error(err)
    });
  }

  loadSkillList(): void {
    this.skillMetaService.getSkills().subscribe({
      next: (data: Skill[]) => this.skillsList = data,
      error: (err: any) => console.error(err)
    });
  }

  loadSkillLevels(): void {
    this.skillMetaService.getSkillLevels().subscribe({
      next: (data: SkillLevel[]) => {
        this.skillLevels = data;
        // mettre à jour les skills déjà chargés
        this.skills = this.skills.map(s => ({
          ...s,
          SkillLevel: this.skillLevels.find(l => l.id === s.actual_skill_level_id) // undefined si non trouvé
        }));
      },
      error: (err: any) => console.error(err)
    });
  }

  getSkillLevelName(id: number | undefined): string {
    if (!id) return 'Niveau inconnu';
    const level = this.skillLevels.find((l) => l.id === id);
    return level ? level.name : 'Niveau inconnu';
  }

  onSubmit(): void {
    if (!this.skillForm.valid) return;

    const formValue = this.skillForm.value;
    const skillData: EmployeeSkill = {
      ...formValue,
      actual_skill_level_id: formValue.actual_skill_level_id?.id // envoyer seulement l'ID
    };

    if (this.editingSkill) {
      this.skillService.update(this.editingSkill.employee_id, this.editingSkill.skill_id, skillData)
        .subscribe({
          next: (updatedSkill: EmployeeSkill) => {
            // mettre à jour SkillLevel pour affichage
            updatedSkill.SkillLevel = this.skillLevels.find(l => l.id === updatedSkill.actual_skill_level_id);
            const index = this.skills.findIndex(s =>
              s.employee_id === updatedSkill.employee_id &&
              s.skill_id === updatedSkill.skill_id
            );
            if (index !== -1) this.skills[index] = updatedSkill;
            this.cancelEdit();
          },
          error: (err: any) => this.errorMessage = err?.message || 'Erreur lors de la mise à jour'
        });
    } else {
      this.skillService.create(skillData)
        .subscribe({
          next: (newSkill: EmployeeSkill) => {
            newSkill.SkillLevel = this.skillLevels.find(l => l.id === newSkill.actual_skill_level_id);
            this.skills.push(newSkill);
            this.cancelEdit();
          },
          error: (err: any) => this.errorMessage = err?.message || 'Erreur lors de l\'ajout'
        });
    }
  }

  editSkill(skill: EmployeeSkill): void {
    this.editingSkill = skill;
    this.showAddForm = true;

    const selectedLevel = this.skillLevels.find(l => l.id === skill.actual_skill_level_id);

    this.skillForm.patchValue({
      employee_id: skill.employee_id,
      skill_id: skill.skill_id,
      actual_skill_level_id: selectedLevel, // objet complet
      acquired_date: skill.acquired_date,
      certification: skill.certification,
      last_evaluated_date: skill.last_evaluated_date
    });
  }

  deleteSkill(skill: EmployeeSkill): void {
    if (!confirm('Voulez-vous vraiment supprimer cette compétence ?')) return;

    this.skillService.delete(skill.employee_id, skill.skill_id)
      .subscribe({
        next: () => this.skills = this.skills.filter(s =>
          !(s.employee_id === skill.employee_id && s.skill_id === skill.skill_id)
        ),
        error: (err: any) => this.errorMessage = err?.message || 'Erreur lors de la suppression'
      });
  }

  cancelEdit(): void {
    this.editingSkill = null;
    this.showAddForm = false;
    this.skillForm.reset();
  }
}
