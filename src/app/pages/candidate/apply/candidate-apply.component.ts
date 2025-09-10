import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { CandidateAuthService } from '../../../services/candidate-auth.service';
import { 
  JobOffer, 
  CandidateCV, 
  JobApplicationRequest,
  Candidate 
} from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './candidate-apply.component.html',
  styleUrls: ['./candidate-apply.component.css']
})
export class CandidateApplyComponent implements OnInit {
  jobOffer: JobOffer | null = null;
  candidateCVs: CandidateCV[] = [];
  currentCandidate: Candidate | null = null;
  
  applicationForm: FormGroup;
  
  loading = false;
  submitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Interview slots
  interviewSlots: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private candidateAuthService: CandidateAuthService,
    private formBuilder: FormBuilder
  ) {
    this.applicationForm = this.formBuilder.group({
      cv_id: [''],
      cover_letter: ['', [Validators.required, Validators.minLength(50)]],
      interview_slot_1: [''],
      interview_slot_2: [''],
      interview_slot_3: ['']
    });
  }

  ngOnInit(): void {
    // Récupérer l'ID de l'offre depuis l'URL
    const jobOfferId = this.route.snapshot.paramMap.get('id');
    if (jobOfferId) {
      this.loadJobOffer(parseInt(jobOfferId));
    }

    // Récupérer le candidat actuel
    this.candidateAuthService.currentCandidate$.subscribe(candidate => {
      this.currentCandidate = candidate;
    });

    // Charger les CVs du candidat
    this.loadCandidateCVs();
  }

  loadJobOffer(id: number): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getPublicJobOfferById(id).subscribe({
      next: (jobOffer) => {
        this.jobOffer = jobOffer;
        this.loading = false;
        
        // Pré-remplir la lettre de motivation
        this.prefillCoverLetter();
      },
      error: (error) => {
        console.error('Error loading job offer:', error);
        this.errorMessage = 'Offre d\'emploi non trouvée ou expirée';
        this.loading = false;
      }
    });
  }

  loadCandidateCVs(): void {
    this.candidateService.getCVs().subscribe({
      next: (cvs) => {
        this.candidateCVs = cvs;
        
        // Sélectionner automatiquement le CV principal
        const primaryCV = cvs.find(cv => cv.is_primary);
        if (primaryCV) {
          this.applicationForm.patchValue({ cv_id: primaryCV.id });
        }
      },
      error: (error) => {
        console.error('Error loading CVs:', error);
      }
    });
  }

  prefillCoverLetter(): void {
    if (!this.jobOffer || !this.currentCandidate) return;

    const coverLetter = `Madame, Monsieur,

Je me permets de vous adresser ma candidature pour le poste de ${this.jobOffer.title} au sein de ${this.jobOffer.company}.

Votre offre a retenu toute mon attention car elle correspond parfaitement à mon profil et à mes aspirations professionnelles.

${this.currentCandidate.bio ? `\n${this.currentCandidate.bio}\n` : ''}

Je serais ravi(e) de pouvoir échanger avec vous sur cette opportunité et vous démontrer ma motivation lors d'un entretien.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${this.currentCandidate.firstName} ${this.currentCandidate.lastName}`;

    this.applicationForm.patchValue({ cover_letter: coverLetter });
  }

  addInterviewSlot(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const slot = tomorrow.toISOString().slice(0, 16);
    this.interviewSlots.push(slot);
  }

  removeInterviewSlot(index: number): void {
    this.interviewSlots.splice(index, 1);
  }

  onSubmit(): void {
    if (!this.applicationForm.valid || !this.jobOffer) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    // Préparer les créneaux d'entretien
    const proposedSlots = [
      this.applicationForm.value.interview_slot_1,
      this.applicationForm.value.interview_slot_2,
      this.applicationForm.value.interview_slot_3
    ].filter(slot => slot && slot.trim() !== '');

    const applicationData: JobApplicationRequest = {
      job_offer_id: this.jobOffer.id!,
      cv_id: this.applicationForm.value.cv_id || undefined,
      cover_letter: this.applicationForm.value.cover_letter,
      proposed_interview_slots: proposedSlots
    };

    this.candidateService.applyToJobOffer(applicationData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        
        // Rediriger vers les candidatures après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/candidate/applications']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error applying to job offer:', error);
        this.errorMessage = error.message || 'Erreur lors de la candidature';
        this.submitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.applicationForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Ce champ est requis';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    
    return null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getRequiredSkills(): any[] {
    if (!this.jobOffer) return [];
    
    if (this.jobOffer.jobDescription?.requiredSkills) {
      return this.jobOffer.jobDescription.requiredSkills;
    }
    if (this.jobOffer.required_skills) {
      return this.jobOffer.required_skills;
    }
    return [];
  }

  getSkillName(skill: any): string {
    return skill?.Skill?.name || skill?.name || 'Compétence non définie';
  }

  getSkillLevel(skill: any): string {
    return skill?.SkillLevel?.level_name || skill?.level_name || 'Niveau non défini';
  }

  goBack(): void {
    this.router.navigate(['/candidate/job-offers']);
  }
}