import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { JobOffer } from '../../../models/candidate.model';

// Add interface for better type safety
interface JobOfferDescription {
  requiredSkills?: Array<{
    Skill?: { name: string };
    name?: string;
    SkillLevel?: { level_name: string };
    level_name?: string;
  }>;
  [key: string]: any;
}

@Component({
  selector: 'app-candidate-job-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './candidate-job-offer-detail.component.html',
  styleUrls: ['./candidate-job-offer-detail.component.css']
})
export class CandidateJobOfferDetailComponent implements OnInit {
  jobOffer: JobOffer | null = null;
  loading = false;
  errorMessage: string | null = null;
  isFavorite = false;

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadJobOffer(parseInt(id));
      this.checkFavoriteStatus(parseInt(id));
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

  checkFavoriteStatus(jobOfferId: number): void {
    this.candidateService.isFavorite(jobOfferId).subscribe({
      next: (response) => {
        this.isFavorite = response.isFavorite;
      },
      error: (error) => {
        console.error('Error checking favorite status:', error);
      }
    });
  }

  toggleFavorite(): void {
    if (!this.jobOffer) return;

    if (this.isFavorite) {
      this.candidateService.removeFromFavorites(this.jobOffer.id!).subscribe({
        next: () => {
          this.isFavorite = false;
        },
        error: (error) => {
          console.error('Error removing from favorites:', error);
        }
      });
    } else {
      this.candidateService.addToFavorites(this.jobOffer.id!).subscribe({
        next: () => {
          this.isFavorite = true;
        },
        error: (error) => {
          console.error('Error adding to favorites:', error);
        }
      });
    }
  }

  hasRequiredSkills(): boolean {
    if (!this.jobOffer?.description) return false;
    
    // Assertion de type pour indiquer à TypeScript ce qu'on attend
    const description = this.jobOffer.description as unknown as JobOfferDescription;
    
    return !!(description.requiredSkills && 
             Array.isArray(description.requiredSkills) &&
             description.requiredSkills.length > 0);
  }

  getRequiredSkills(): any[] {
    if (!this.hasRequiredSkills()) return [];
    return (this.jobOffer!.description as any).requiredSkills;
  }

  getSkillName(skill: any): string {
    return skill?.Skill?.name || skill?.name || 'Compétence non définie';
  }

  getSkillLevel(skill: any): string {
    return skill?.SkillLevel?.level_name || skill?.level_name || 'Niveau non défini';
  }

  getJobDescription(): any {
    return (this.jobOffer as any)?.jobDescription || null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
    }