// profile.component.ts - Version améliorée
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { SkillService } from '../../services/skill.service';
import { EmployeeSkillService } from '../../services/employee-skill.service';
import { Employee, Skill, SkillLevel } from '../../models/employee.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  employee: Employee | null = null;
  profileForm: FormGroup;
  skills: Skill[] = [];
  skillLevels: SkillLevel[] = [];
  
  loading: boolean = true;
  saving: boolean = false;
  loadingSkills: boolean = false;
  
  errorMessage: string | null = null;
  successMessage: string | null = null;
  skillMessage: string | null = null;
  
  isEditing: boolean = false;
  selectedFile: File | null = null;
  profileImagePreview: string | ArrayBuffer | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private skillService: SkillService,
    private employeeSkillService: EmployeeSkillService,
    private formBuilder: FormBuilder
  ) {
    this.profileForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      position: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      hire_date: ['', Validators.required],
      phone: [''],
      gender: [''],
      location: [''],
      department: [''],
      notes: [''],
      skills: this.formBuilder.array([])
    });
  }

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('id');
    if (employeeId) {
      this.loadEmployee(parseInt(employeeId));
      this.loadSkillsData();
    }
  }

  loadEmployee(id: number): void {
    this.loading = true;
    this.errorMessage = null;
    
    this.employeeService.getEmployeeById(id).subscribe({
      next: (employee) => {
        this.employee = employee;
        this.populateForm();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading employee:', err);
        this.errorMessage = 'Erreur lors du chargement du profil employé.';
        this.loading = false;
      }
    });
  }

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

  get skillsFormArray(): FormArray {
    return this.profileForm.get('skills') as FormArray;
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La taille du fichier ne doit pas dépasser 5MB.';
        return;
      }

      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Seuls les fichiers JPG, PNG et GIF sont acceptés.';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = null;
      
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

  getProfileImage(): string {
    if (this.profileImagePreview) {
      return this.profileImagePreview as string;
    }
    if (this.employee?.profile_picture) {
      if (this.employee.profile_picture.startsWith('http')) {
        return this.employee.profile_picture;
      }
      return `http://localhost:3000${this.employee.profile_picture}`;
    }
    return '';
  }

  hasProfileImage(): boolean {
    return !!(this.profileImagePreview || 
             (this.employee?.profile_picture && 
              this.employee.profile_picture.trim() !== ''));
  }

  populateForm(): void {
    if (!this.employee) return;

    this.profileForm.patchValue({
      name: this.employee.name,
      position: this.employee.position,
      email: this.employee.email,
      hire_date: this.employee.hire_date,
      phone: this.employee.phone || '',
      gender: this.employee.gender || '',
      location: this.employee.location || '',
      department: this.employee.department || '',
      notes: this.employee.notes || ''
    });

    // Charger les compétences existantes
    this.clearSkillsArray();
    const employeeSkills = this.employee.skills || this.employee.EmployeeSkills || [];
    employeeSkills.forEach(skill => {
      this.addSkillToForm(skill);
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.selectedFile = null;
      this.profileImagePreview = null;
      this.populateForm(); // Reset form if canceling edit
      this.clearMessages();
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid && this.employee) {
      this.saving = true;
      this.clearMessages();

      const formValue = this.profileForm.value;
      const formData = new FormData();
      
      // Données de base
      formData.append('name', formValue.name);
      formData.append('position', formValue.position);
      formData.append('email', formValue.email);
      formData.append('hire_date', formValue.hire_date);
      formData.append('phone', formValue.phone || '');
      formData.append('gender', formValue.gender || '');
      formData.append('location', formValue.location || '');
      formData.append('department', formValue.department || '');
      formData.append('notes', formValue.notes || '');
      
      // Compétences
      const skillsData = formValue.skills
        .filter((skill: any) => skill.skill_id && skill.actual_skill_level_id)
        .map((skill: any) => ({
          skill_id: parseInt(skill.skill_id, 10),
          actual_skill_level_id: parseInt(skill.actual_skill_level_id, 10),
          acquired_date: skill.acquired_date || null,
          certification: skill.certification || null,
          last_evaluated_date: skill.last_evaluated_date || null
        }));
      formData.append('skills', JSON.stringify(skillsData));
      
      // Photo de profil
      if (this.selectedFile) {
        formData.append('profile_picture', this.selectedFile);
      }
      
      this.employeeService.updateEmployeeWithFormData(this.employee.id!, formData).subscribe({
        next: (updatedEmployee) => {
          this.employee = updatedEmployee;
          this.isEditing = false;
          this.selectedFile = null;
          this.profileImagePreview = null;
          this.successMessage = 'Profil mis à jour avec succès.';
          this.saving = false;
          this.populateForm();
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          this.errorMessage = 'Erreur lors de la mise à jour du profil.';
          this.saving = false;
        }
      });
    }
  }

  // Méthodes pour les compétences
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

  // Méthodes utilitaires
  goBack(): void {
    this.router.navigate(['/employees']);
  }

  getFirstCharSafe(name: string | undefined): string {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  }

  formatDateSafe(dateString: string | null | undefined): string {
    if (!dateString) return 'Non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.skillMessage = null;
  }

  // Méthodes sécurisées pour l'affichage des compétences
  getEmployeeSkills(): any[] {
    if (!this.employee) return [];
    return this.employee.skills || this.employee.EmployeeSkills || [];
  }

  hasSkills(): boolean {
    return this.getEmployeeSkills().length > 0;
  }

  getSkillsCount(): number {
    return this.getEmployeeSkills().length;
  }
}