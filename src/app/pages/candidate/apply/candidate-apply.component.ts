import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { JobOffer } from '../../../models/candidate.model'; // Fixed import
import { CandidateCV } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-apply',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './candidate-apply.component.html',
  styleUrls: ['./candidate-apply.component.css']
})
export class CandidateApplyComponent implements OnInit {
  jobOffer: JobOffer | null = null;
  cvs: CandidateCV[] = [];
  applicationForm: FormGroup;
  interviewSlots: string[] = ['', '', ''];
  
  loading = false;
  submitting = false;
  success = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  jobOfferId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private formBuilder: FormBuilder
  ) {
    this.applicationForm = this.formBuilder.group({
      cv_id: ['', Validators.required],
      cover_letter: ['', [Validators.required, Validators.minLength(50)]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jobOfferId = parseInt(id);
      this.loadJobOffer(this.jobOfferId);
      this.loadCVs();
    }
  }

  loadJobOffer(id: number): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getPublicJobOfferById(id).subscribe({
      next: (jobOffer) => {
        this.jobOffer = jobOffer;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading job offer:', error);
        this.errorMessage = 'Offre d\'emploi non trouvée ou expirée';
        this.loading = false;
      }
    });
  }

  loadCVs(): void {
    this.candidateService.getCVs().subscribe({
      next: (cvs) => {
        this.cvs = cvs;
        
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

  selectCV(cvId: number): void {
    this.applicationForm.patchValue({ cv_id: cvId });
  }

  addSlot(): void {
    if (this.interviewSlots.length < 5) {
      this.interviewSlots.push('');
    }
  }

  removeSlot(index: number): void {
    if (this.interviewSlots.length > 1) {
      this.interviewSlots.splice(index, 1);
    }
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  }

  onSubmit(): void {
    if (this.applicationForm.invalid || !this.jobOfferId) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    // Filtrer les créneaux valides
    const validSlots = this.interviewSlots
      .filter(slot => slot && slot.trim() !== '')
      .map(slot => new Date(slot).toISOString());

    const applicationData = {
      job_offer_id: this.jobOfferId,
      cv_id: this.applicationForm.value.cv_id,
      cover_letter: this.applicationForm.value.cover_letter,
      proposed_interview_slots: validSlots
    };

    this.candidateService.applyToJobOffer(applicationData).subscribe({
      next: (response) => {
        this.success = true;
        this.successMessage = response.message;
        this.submitting = false;
      },
      error: (error) => {
        console.error('Error applying to job offer:', error);
        this.errorMessage = error.message || 'Erreur lors de l\'envoi de la candidature';
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

  downloadCV(cvId: number): void {
    this.candidateService.downloadCV(cvId).subscribe({
      next: (blob) => {
        const cv = this.cvs.find(c => c.id === cvId);
        if (cv) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = cv.file_name;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: (error) => {
        console.error('Error downloading CV:', error);
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}