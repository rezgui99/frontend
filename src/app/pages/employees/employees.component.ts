import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { SkillService } from '../../services/skill.service';
import { JobDescriptionService } from '../../services/job-description.service';
import { MatchingService } from '../../services/matching.service';
import { Employee, Skill, SkillLevel } from '../../models/employee.model';
import { JobDescription } from '../../models/job-description.model';
import { MatchingResult } from '../../models/matching.model';
import { EmployeeSkillService } from '../../services/employee-skill.service';
import { AnalyticsService } from '../../services/analytics.service';
import { EmployeeSkillRecommendation, ApplicationSuccessPrediction } from '../../models/analytics.model';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css']
})
export class EmployeesComponent implements OnInit {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  employeeForm: FormGroup;
  skillForm: FormGroup;
  jobDescriptions: JobDescription[] = [];
  skills: Skill[] = [];
  skillLevels: SkillLevel[] = [];
  
  // États des formulaires
  showAddForm: boolean = false;
  showSkillForm: boolean = false;
  editingEmployee: Employee | null = null;
  editingSkill: any = null;
  selectedEmployee: Employee | null = null;
  
  // Vue détaillée des compétences
  showSkillsDetailModal: boolean = false;
  skillsDetailEmployee: Employee | null = null;
    selectedFile: File | null = null;
  profileImagePreview: string | ArrayBuffer | null = null;
  // États de chargement
  loading: boolean = false;
  loadingJobs: boolean = false;
  loadingSkills: boolean = false;
  savingEmployee: boolean = false;
  savingSkill: boolean = false;
  
  // Messages
  errorMessage: string | null = null;
  successMessage: string | null = null;
  skillErrorMessage: string | null = null;
  skillSuccessMessage: string | null = null;
  
  // Filtres et recherche
  searchQuery: string = '';
  selectedPosition: string = '';
  selectedLocation: string = '';
  positionOptions: string[] = [];
  locationOptions: string[] = [];
  
  // Affectation automatique
  showAutoAssignModal: boolean = false;
  autoAssigningEmployee: Employee | null = null;
  bestJobMatches: MatchingResult[] = [];
  loadingBestMatches: boolean = false;
  autoAssignMessage: string | null = null;

  // Recommandations de compétences
  showRecommendationsModal: boolean = false;
  recommendationsEmployee: Employee | null = null;
  skillRecommendations: EmployeeSkillRecommendation | null = null;
  loadingRecommendations: boolean = false;
  recommendationsMessage: string | null = null;

  constructor(
    private employeeService: EmployeeService,
    private skillService: SkillService,
    private jobDescriptionService: JobDescriptionService,
    private matchingService: MatchingService,
    private employeeSkillService: EmployeeSkillService,
    private analyticsService: AnalyticsService,
    private formBuilder: FormBuilder
  ) {
   this.employeeForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      position: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      hire_date: ['', Validators.required],
      phone: [''],
      gender: [''],
      location: [''],
      department: [''],
      notes: [''],
      skills: this.formBuilder.array([])
    });

    this.skillForm = this.formBuilder.group({
      employee_id: ['', Validators.required],
      skill_id: ['', Validators.required],
      actual_skill_level_id: ['', Validators.required],
      acquired_date: [''],
      certification: [''],
      last_evaluated_date: ['']
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadSkillsData();
    this.loadJobDescriptions();
  }

  // ==================== CRUD EMPLOYÉS ====================
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeProfileImage(): void {
    this.selectedFile = null;
    this.profileImagePreview = null;
    const fileInput = document.getElementById('profile_picture') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  loadEmployees(): void {
    this.loading = true;
    this.errorMessage = null;
    this.employeeService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = [...employees];
        this.extractFilterOptions();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.errorMessage = 'Erreur lors du chargement des employés.';
        this.loading = false;
      }
    });
  }

  showAddEmployeeForm(): void {
    this.showAddForm = true;
    this.editingEmployee = null;
    this.employeeForm.reset();
    this.clearSkillsArray();
    this.clearMessages();
  }

  editEmployee(employee: Employee): void {
    this.editingEmployee = employee;
    this.showAddForm = true;
    
    this.employeeForm.patchValue({
      name: employee.name,
      position: employee.position,
      email: employee.email,
      hire_date: employee.hire_date,
      phone: employee.phone || '',
      gender: employee.gender || '',
      location: employee.location || '',
      notes: employee.notes || '',
    });

    this.clearSkillsArray();
    if (employee.skills && employee.skills.length > 0) {
      employee.skills.forEach(empSkill => {
        this.addSkillToForm(empSkill);
      });
    }
    this.clearMessages();
  }

// employees.component.ts (extrait modifié)
onEmployeeSubmit(): void {
  if (this.employeeForm.valid) {
    this.savingEmployee = true;
    const formValue = this.employeeForm.value;
    
    const skillsData = formValue.skills
      .filter((skill: any) => skill.skill_id && skill.actual_skill_level_id)
      .map((skill: any) => ({
        skill_id: parseInt(skill.skill_id, 10),
        actual_skill_level_id: parseInt(skill.actual_skill_level_id, 10),
        acquired_date: skill.acquired_date || null,
        certification: skill.certification || null,
        last_evaluated_date: skill.last_evaluated_date || null
      }));

    // Créer FormData pour l'envoi
    const formData = new FormData();
    formData.append('name', formValue.name);
    formData.append('position', formValue.position);
    formData.append('email', formValue.email);
    formData.append('hire_date', formValue.hire_date);
    formData.append('phone', formValue.phone || '');
    formData.append('gender', formValue.gender || '');
    formData.append('location', formValue.location || '');
    formData.append('department', formValue.department || '');
    formData.append('notes', formValue.notes || '');
    formData.append('skills', JSON.stringify(skillsData));
    
    // Ajouter le fichier s'il est sélectionné
    if (this.selectedFile) {
      formData.append('profile_picture', this.selectedFile);
    }
    
    if (this.editingEmployee) {
      // Utiliser la nouvelle méthode avec FormData
      this.employeeService.updateEmployeeWithFormData(this.editingEmployee.id!, formData).subscribe({
        next: (updatedEmployee) => {
          const index = this.employees.findIndex(emp => emp.id === updatedEmployee.id);
          if (index !== -1) {
            this.employees[index] = updatedEmployee;
          }
          this.applyFilters();
          this.successMessage = 'Employé mis à jour avec succès';
          this.cancelEmployeeEdit();
          this.savingEmployee = false;
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          this.errorMessage = `Erreur mise à jour: ${err.error?.message || err.message}`;
          this.savingEmployee = false;
        }
      });
    } else {
      // Utiliser la nouvelle méthode avec FormData
      this.employeeService.createEmployeeWithFormData(formData).subscribe({
        next: (newEmployee) => {
          this.employees.push(newEmployee);
          this.applyFilters();
          this.extractFilterOptions();
          this.successMessage = 'Employé créé avec succès';
          this.cancelEmployeeEdit();
          this.savingEmployee = false;
        },
        error: (err) => {
          console.error('Error creating employee:', err);
          this.errorMessage = `Erreur création: ${err.error?.message || err.message}`;
          this.savingEmployee = false;
        }
      });
    }
  }
}


  deleteEmployee(employee: Employee): void {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${employee.name} et toutes ses compétences ?`)) {
      this.employeeService.deleteEmployee(employee.id!).subscribe({
        next: () => {
          this.employees = this.employees.filter(emp => emp.id !== employee.id);
          this.applyFilters();
          this.extractFilterOptions();
          this.successMessage = 'Employé supprimé avec succès';
          this.errorMessage = null;
        },
        error: (err) => {
          console.error('Error deleting employee:', err);
          this.errorMessage = 'Erreur lors de la suppression de l\'employé.';
        }
      });
    }
  }

  cancelEmployeeEdit(): void {
    this.editingEmployee = null;
    this.showAddForm = false;
    this.employeeForm.reset();
    this.clearSkillsArray();
    this.clearMessages();
  }

  // ==================== CRUD COMPÉTENCES ====================

  get skillsFormArray(): FormArray {
    return this.employeeForm.get('skills') as FormArray;
  }

  addSkillToForm(existingSkill?: any): void {
    const skillGroup = this.formBuilder.group({
      skill_id: [existingSkill?.skill_id || '', Validators.required],
      actual_skill_level_id: [existingSkill?.actual_skill_level_id || '', Validators.required],
      acquired_date: [existingSkill?.acquired_date || ''],
      certification: [existingSkill?.certification || ''],
      last_evaluated_date: [existingSkill?.last_evaluated_date || '']
    });
    this.skillsFormArray.push(skillGroup);
  }

  removeSkillFromForm(index: number): void {
    this.skillsFormArray.removeAt(index);
  }

  clearSkillsArray(): void {
    while (this.skillsFormArray.length !== 0) {
      this.skillsFormArray.removeAt(0);
    }
  }

  // Gestion des compétences individuelles pour employés existants
  showAddSkillForm(employee: Employee): void {
    this.selectedEmployee = employee;
    this.showSkillForm = true;
    this.editingSkill = null;
    this.skillForm.patchValue({
      employee_id: employee.id
    });
    this.skillForm.get('skill_id')?.setValue('');
    this.skillForm.get('actual_skill_level_id')?.setValue('');
    this.skillForm.get('acquired_date')?.setValue('');
    this.skillForm.get('certification')?.setValue('');
    this.skillForm.get('last_evaluated_date')?.setValue('');
    this.clearSkillMessages();
  }

  editEmployeeSkill(employee: Employee, skill: any): void {
    this.selectedEmployee = employee;
    this.editingSkill = skill;
    this.showSkillForm = true;
    this.skillForm.patchValue({
      employee_id: employee.id,
      skill_id: skill.skill_id,
      actual_skill_level_id: skill.actual_skill_level_id,
      acquired_date: skill.acquired_date || '',
      certification: skill.certification || '',
      last_evaluated_date: skill.last_evaluated_date || ''
    });
    this.clearSkillMessages();
  }

  onSkillSubmit(): void {
    if (this.skillForm.valid && this.selectedEmployee) {
      this.savingSkill = true;
      const skillData = {
        employee_id: this.selectedEmployee.id!,
        skill_id: parseInt(this.skillForm.value.skill_id, 10),
        actual_skill_level_id: parseInt(this.skillForm.value.actual_skill_level_id, 10),
        acquired_date: this.skillForm.value.acquired_date || null,
        certification: this.skillForm.value.certification || null,
        last_evaluated_date: this.skillForm.value.last_evaluated_date || null
      };

      if (this.editingSkill) {
        // Mise à jour d'une compétence existante
        this.employeeSkillService.update(
          this.editingSkill.employee_id,
          this.editingSkill.skill_id,
          skillData
        ).subscribe({
          next: () => {
            this.skillSuccessMessage = 'Compétence mise à jour avec succès';
            this.loadEmployees(); // Recharger pour voir les changements
            this.cancelSkillEdit();
            this.savingSkill = false;
          },
          error: (err) => {
            console.error('Error updating skill:', err);
            this.skillErrorMessage = `Erreur mise à jour: ${err.error?.message || err.message}`;
            this.savingSkill = false;
          }
        });
      } else {
        // Création d'une nouvelle compétence
        this.employeeSkillService.create(skillData).subscribe({
          next: () => {
            this.skillSuccessMessage = 'Compétence ajoutée avec succès';
            this.loadEmployees(); // Recharger pour voir les changements
            this.cancelSkillEdit();
            this.savingSkill = false;
          },
          error: (err) => {
            console.error('Error creating skill:', err);
            this.skillErrorMessage = `Erreur création: ${err.error?.message || err.message}`;
            this.savingSkill = false;
          }
        });
      }
    }
  }

  deleteEmployeeSkill(employee: Employee, skill: any): void {
    const skillName = this.getSkillName(skill.skill_id);
    if (window.confirm(`Supprimer la compétence "${skillName}" de ${employee.name} ?`)) {
      this.employeeSkillService.delete(employee.id!, skill.skill_id).subscribe({
        next: () => {
          // Mettre à jour localement
          if (employee.skills) {
            const skillIndex = employee.skills.findIndex(s => s.skill_id === skill.skill_id);
            if (skillIndex !== -1) {
              employee.skills.splice(skillIndex, 1);
            }
          }
          this.skillSuccessMessage = 'Compétence supprimée avec succès';
        },
        error: (err) => {
          console.error('Error deleting skill:', err);
          this.skillErrorMessage = 'Erreur lors de la suppression de la compétence.';
        }
      });
    }
  }

  cancelSkillEdit(): void {
    this.showSkillForm = false;
    this.editingSkill = null;
    this.selectedEmployee = null;
    this.skillForm.reset();
    this.clearSkillMessages();
  }
  // ==================== FILTRES ET RECHERCHE ====================

  extractFilterOptions(): void {
    const positions = new Set<string>();
    const locations = new Set<string>();

    this.employees.forEach(emp => {
      if (emp.position) positions.add(emp.position);
      if (emp.location) locations.add(emp.location);
    });

    this.positionOptions = Array.from(positions).sort();
    this.locationOptions = Array.from(locations).sort();
  }

  applyFilters(): void {
    this.filteredEmployees = this.employees.filter(emp => {
      const matchesSearch = !this.searchQuery || 
        emp.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesPosition = !this.selectedPosition || emp.position === this.selectedPosition;
      const matchesLocation = !this.selectedLocation || emp.location === this.selectedLocation;

      return matchesSearch && matchesPosition && matchesLocation;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedPosition = '';
    this.selectedLocation = '';
    this.filteredEmployees = [...this.employees];
  }

  // ==================== DONNÉES AUXILIAIRES ====================

  loadSkillsData(): void {
    this.loadingSkills = true;
    Promise.all([
      this.skillService.getSkills().toPromise(),
      this.skillService.getSkillLevels().toPromise()
    ]).then(([skills, skillLevels]) => {
      this.skills = skills || [];
      this.skillLevels = skillLevels || [];
      this.loadingSkills = false;
    }).catch(err => {
      console.error('Error loading skills data:', err);
      this.loadingSkills = false;
    });
  }

  loadJobDescriptions(): void {
    this.loadingJobs = true;
    this.jobDescriptionService.getJobDescriptions().subscribe({
      next: (jobDescriptions) => {
        this.jobDescriptions = jobDescriptions;
        this.loadingJobs = false;
      },
      error: (err) => {
        console.error('Error loading job descriptions:', err);
        this.loadingJobs = false;
      }
    });
  }

  // ==================== MATCHING ET AFFECTATION ====================

  findBestJobForEmployee(employee: Employee): void {
    this.autoAssigningEmployee = employee;
    this.showAutoAssignModal = true;
    this.loadingBestMatches = true;
    this.autoAssignMessage = null;
    this.bestJobMatches = [];

    this.matchingService.findBestJobForEmployeeAlternative(employee.id!, this.jobDescriptions)
      .subscribe({
        next: (matches) => {
          this.bestJobMatches = matches.slice(0, 5);
          this.loadingBestMatches = false;
          
          if (this.bestJobMatches.length === 0) {
            this.autoAssignMessage = 'Aucun poste compatible trouvé pour cet employé.';
          }
        },
        error: (err) => {
          console.error('Error finding best job matches:', err);
          this.autoAssignMessage = 'Erreur lors de la recherche des postes compatibles.';
          this.loadingBestMatches = false;
        }
      });
  }

  assignToBestJob(jobId: number, score: number): void {
    if (!this.autoAssigningEmployee) return;

    const confirmMessage = `Voulez-vous affecter ${this.autoAssigningEmployee.name} à ce poste ?\n\nScore de compatibilité : ${score.toFixed(1)}%`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    this.employeeService.assignEmployeeToJobDescription(this.autoAssigningEmployee.id!, jobId)
      .subscribe({
        next: () => {
          this.autoAssignMessage = `✅ ${this.autoAssigningEmployee!.name} a été affecté(e) avec succès !`;
          this.bestJobMatches = [];
          
          setTimeout(() => {
            this.closeAutoAssignModal();
          }, 2000);
        },
        error: (err) => {
          console.error('Error assigning employee:', err);
          this.autoAssignMessage = `❌ Erreur lors de l'affectation : ${err.error?.message || err.message}`;
        }
      });
  }

  closeAutoAssignModal(): void {
    this.showAutoAssignModal = false;
    this.autoAssigningEmployee = null;
    this.bestJobMatches = [];
    this.autoAssignMessage = null;
    this.loadingBestMatches = false;
  }

  // ==================== UTILITAIRES ====================

  getSkillName(skillId: number): string {
    const skill = this.skills.find(s => s.id === skillId);
    return skill ? skill.name : 'Compétence inconnue';
  }

  getSkillLevelName(levelId: number): string {
    const level = this.skillLevels.find(l => l.id === levelId);
    return level ? level.level_name : 'Niveau inconnu';
  }

  getSkillLevelValue(levelId: number): number {
    const level = this.skillLevels.find(l => l.id === levelId);
    return level ? level.value : 0;
  }

  getSkillLevelClass(levelValue: number): string {
    if (levelValue <= 1) return 'bg-red-100 text-red-800';
    if (levelValue <= 2) return 'bg-yellow-100 text-yellow-800';
    if (levelValue <= 3) return 'bg-blue-100 text-blue-800';
    if (levelValue <= 4) return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  }

  getJobNameFromId(jobId: number): string {
    const job = this.jobDescriptions.find(j => j.id === jobId);
    return job ? job.emploi : 'Poste inconnu';
  }
// Dans employees.component.ts, correction de la méthode getProfileImage
// Ajouter ces méthodes dans employees.component.ts

// Gestion des erreurs d'image
onImageError(event: any, employee: Employee): void {
  console.warn(`Erreur de chargement d'image pour ${employee.name}:`, employee.profile_picture);
  // Masquer l'image en cas d'erreur
  event.target.style.display = 'none';
  // Optionnel: vous pouvez aussi mettre à jour l'objet employee pour marquer l'image comme défaillante
}

// Méthode pour vérifier si l'employé a une photo valide
hasProfileImage(employee: Employee): boolean {
  return !!(employee.profile_picture && 
           employee.profile_picture.trim() !== '' && 
           !employee.profile_picture.includes('undefined') &&
           !employee.profile_picture.includes('null'));
}

// Méthode corrigée pour obtenir l'image de profil
getProfileImage(employee: Employee): string {
  if (!employee.profile_picture) return '';
  
  // Si l'URL est déjà complète
  if (employee.profile_picture.startsWith('http')) {
    return employee.profile_picture;
  }
  
  // Si c'est un chemin relatif, construire l'URL complète
  const baseUrl = 'http://localhost:3000';
  const imagePath = employee.profile_picture.startsWith('/') ? 
                   employee.profile_picture : 
                   `/${employee.profile_picture}`;
  
  return `${baseUrl}${imagePath}`;
}
  getJobFiliereFromId(jobId: number): string {
    const job = this.jobDescriptions.find(j => j.id === jobId);
    return job ? job.filiere_activite : 'Filière inconnue';
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.clearSkillMessages();
  }

  clearSkillMessages(): void {
    this.skillErrorMessage = null;
    this.skillSuccessMessage = null;
  }

  // ==================== VUE DÉTAILLÉE DES COMPÉTENCES ====================

  showEmployeeSkillsDetail(employee: Employee): void {
    this.skillsDetailEmployee = employee;
    this.showSkillsDetailModal = true;
    this.clearSkillMessages();
  }

  closeSkillsDetailModal(): void {
    this.showSkillsDetailModal = false;
    this.skillsDetailEmployee = null;
    this.clearSkillMessages();
  }

  addSkillToDetailEmployee(): void {
    if (this.skillsDetailEmployee) {
      this.showAddSkillForm(this.skillsDetailEmployee);
      this.closeSkillsDetailModal();
    }
  }

  editSkillFromDetail(skill: any): void {
    if (this.skillsDetailEmployee) {
      this.editEmployeeSkill(this.skillsDetailEmployee, skill);
      this.closeSkillsDetailModal();
    }
  }

  deleteSkillFromDetail(skill: any): void {
    if (this.skillsDetailEmployee) {
      this.deleteEmployeeSkill(this.skillsDetailEmployee, skill);
      // Recharger les données après suppression
      setTimeout(() => {
        this.loadEmployees();
      }, 500);
    }
  }

  getSkillTypeNameSafe(skill: any): string {
    if (!skill) return 'Type inconnu';
    
    // Différentes structures possibles
    if (skill.skill?.type?.type_name) return skill.skill.type.type_name;
    if (skill.Skill?.type?.type_name) return skill.Skill.type.type_name;
    
    // Fallback
    const skillId = skill.skill_id || skill.id;
    const skillObj = this.skills.find(s => s.id === skillId);
    return skillObj?.type?.type_name || 'Type inconnu';
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  // Méthode sécurisée pour formater les dates avec undefined
  formatDateSafe(dateString: string | null | undefined): string {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  // Méthode sécurisée pour obtenir le premier caractère
  getFirstCharSafe(name: string | undefined): string {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  }

  // ==================== RECOMMANDATIONS DE COMPÉTENCES ====================

  showSkillRecommendations(employee: Employee): void {
    this.recommendationsEmployee = employee;
    this.showRecommendationsModal = true;
    this.loadingRecommendations = true;
    this.recommendationsMessage = null;
    this.skillRecommendations = null;

    this.analyticsService.getEmployeeSkillRecommendations(employee.id!).subscribe({
      next: (recommendations) => {
        this.skillRecommendations = recommendations;
        this.loadingRecommendations = false;
      },
      error: (err) => {
        console.error('Error loading skill recommendations:', err);
        this.recommendationsMessage = 'Erreur lors du chargement des recommandations.';
        this.loadingRecommendations = false;
      }
    });
  }

  closeRecommendationsModal(): void {
    this.showRecommendationsModal = false;
    this.recommendationsEmployee = null;
    this.skillRecommendations = null;
    this.recommendationsMessage = null;
    this.loadingRecommendations = false;
  }

  getPriorityClass(score: number): string {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  }

  getPriorityLabel(score: number): string {
    if (score >= 80) return 'CRITIQUE';
    if (score >= 60) return 'ÉLEVÉE';
    if (score >= 40) return 'MOYENNE';
    return 'FAIBLE';
  }

  // Méthode sécurisée pour vérifier les compétences
  hasSkillsSafe(employee: Employee | null): boolean {
    return !!(employee?.skills && Array.isArray(employee.skills) && employee.skills.length > 0) ||
           !!(employee?.EmployeeSkills && Array.isArray(employee.EmployeeSkills) && employee.EmployeeSkills.length > 0);
  }

  // Méthode sécurisée pour obtenir les compétences
  getSkillsSafe(employee: Employee | null): any[] {
    // Essayer d'abord la propriété 'skills', puis 'EmployeeSkills'
    if (employee?.skills && Array.isArray(employee.skills)) {
      return employee.skills;
    }
    if (employee?.EmployeeSkills && Array.isArray(employee.EmployeeSkills)) {
      return employee.EmployeeSkills;
    }
    return [];
  }

  // Compter les compétences d'un employé
  getSkillsCount(employee: Employee): number {
    // Essayer d'abord la propriété 'skills', puis 'EmployeeSkills'
    if (employee.skills && Array.isArray(employee.skills)) {
      return employee.skills.length;
    }
    if ((employee as any).EmployeeSkills && Array.isArray((employee as any).EmployeeSkills)) {
      return (employee as any).EmployeeSkills.length;
    }
    return 0;
  }

  // Statistiques pour la vue détaillée
  getCertifiedSkillsCount(employee: Employee): number {
    const skills = this.getSkillsSafe(employee);
    return skills.filter(skill => skill.certification && skill.certification.trim() !== '').length;
  }

  getAverageSkillLevel(employee: Employee): number {
    const skills = this.getSkillsSafe(employee);
    if (skills.length === 0) return 0;
    
    const totalValue = skills.reduce((sum, skill) => {
      return sum + this.getSkillLevelValueSafe(skill);
    }, 0);
    
    return totalValue / skills.length;
  }

  getSkillsByTypeCount(employee: Employee): number {
    const skills = this.getSkillsSafe(employee);
    if (skills.length === 0) return 0;
    
    const types = new Set<string>();
    skills.forEach(skill => {
      const typeName = this.getSkillTypeNameSafe(skill);
      if (typeName !== 'Type inconnu') {
        types.add(typeName);
      }
    });
    
    return types.size;
  }

  // Obtenir les compétences visibles (premières compétences)
  getVisibleSkills(employee: Employee, limit: number = 2): any[] {
    const skills = this.getSkillsSafe(employee);
    return skills.slice(0, limit);
  }

  // Obtenir le nombre de compétences cachées
  getHiddenSkillsCount(employee: Employee, limit: number = 2): number {
    const skills = this.getSkillsSafe(employee);
    return Math.max(0, skills.length - limit);
  }

  // Obtenir le nom de la compétence avec gestion d'erreur
  getSkillNameSafe(skill: any): string {
    if (!skill) return 'Compétence inconnue';
    
    // Différentes structures possibles
    if (skill.skill?.name) return skill.skill.name;
    if (skill.Skill?.name) return skill.Skill.name;
    if (skill.name) return skill.name;
    
    // Fallback avec l'ID
    const skillId = skill.skill_id || skill.id;
    return this.getSkillName(skillId);
  }

  // Obtenir le nom du niveau avec gestion d'erreur
  getSkillLevelNameSafe(skill: any): string {
    if (!skill) return 'Niveau inconnu';
    
    // Différentes structures possibles
    if (skill.SkillLevel?.level_name) return skill.SkillLevel.level_name;
    if (skill.skill_level?.level_name) return skill.skill_level.level_name;
    if (skill.level_name) return skill.level_name;
    
    // Fallback avec l'ID
    const levelId = skill.actual_skill_level_id || skill.level_id;
    return this.getSkillLevelName(levelId);
  }

  // Obtenir la valeur du niveau avec gestion d'erreur
  getSkillLevelValueSafe(skill: any): number {
    if (!skill) return 0;
    
    // Différentes structures possibles
    if (skill.SkillLevel?.value) return skill.SkillLevel.value;
    if (skill.skill_level?.value) return skill.skill_level.value;
    if (skill.value) return skill.value;
    
    // Fallback avec l'ID
    const levelId = skill.actual_skill_level_id || skill.level_id;
    return this.getSkillLevelValue(levelId);
  }
}