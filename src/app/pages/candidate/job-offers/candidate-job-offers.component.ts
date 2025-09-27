import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { 
  JobOffer, 
  JobOfferFilters, 
  FilterOptions,
  PublicJobOffersResponse 
} from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-job-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-job-offers.component.html',
  styleUrls: ['./candidate-job-offers.component.css']
})
export class CandidateJobOffersComponent implements OnInit {
  jobOffers: JobOffer[] = [];
  loading = false;
  errorMessage: string | null = null;
  
  // Filtres
  filters: JobOfferFilters = {
    page: 1,
    limit: 12,
    sort_by: 'createdAt',
    sort_order: 'DESC'
  };
  
  // Options de filtres
  filterOptions: FilterOptions = {
    contractTypes: [],
    workModes: [],
    departments: [],
    experienceLevels: [],
    locations: [],
    topSkills: [],
    salaryRange: { min: 20000, max: 100000 }
  };
  
  // Pagination
  pagination = {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0
  };
  
  // Favoris
  favoriteJobIds = new Set<number>();

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.loadJobOffers();
    this.loadFilterOptions();
    this.loadFavorites();
  }

  loadJobOffers(): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getPublicJobOffers(this.filters).subscribe({
      next: (response: any) => {
        // Gérer différents formats de réponse
        if (response.jobOffers) {
          this.jobOffers = response.jobOffers;
          this.pagination = response.pagination;
        } else if (Array.isArray(response)) {
          this.jobOffers = response;
          this.pagination.total = response.length;
        } else {
          this.jobOffers = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading job offers:', error);
        this.errorMessage = 'Erreur lors du chargement des offres d\'emploi';
        this.loading = false;
      }
    });
  }

  loadFilterOptions(): void {
    this.candidateService.getFilterOptions().subscribe({
      next: (options) => {
        this.filterOptions = options;
      },
      error: (error) => {
        console.error('Error loading filter options:', error);
      }
    });
  }

  loadFavorites(): void {
    this.candidateService.getFavorites().subscribe({
      next: (favorites) => {
        this.favoriteJobIds = new Set(favorites.map(f => f.job_offer_id));
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadJobOffers();
  }

  clearFilters(): void {
    this.filters = {
      page: 1,
      limit: 12,
      sort_by: 'createdAt',
      sort_order: 'DESC'
    };
    this.loadJobOffers();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadJobOffers();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.pagination.page - 2);
    const end = Math.min(this.pagination.totalPages, this.pagination.page + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStartIndex(): number {
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  getEndIndex(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
  }

  toggleFavorite(jobOffer: JobOffer): void {
    if (!jobOffer.id) return;

    if (this.isFavorite(jobOffer.id)) {
      this.candidateService.removeFromFavorites(jobOffer.id).subscribe({
        next: () => {
          this.favoriteJobIds.delete(jobOffer.id!);
        },
        error: (error) => {
          console.error('Error removing from favorites:', error);
        }
      });
    } else {
      this.candidateService.addToFavorites(jobOffer.id).subscribe({
        next: () => {
          this.favoriteJobIds.add(jobOffer.id!);
        },
        error: (error) => {
          console.error('Error adding to favorites:', error);
        }
      });
    }
  }

  isFavorite(jobOfferId: number): boolean {
    return this.favoriteJobIds.has(jobOfferId);
  }

  quickApply(jobOffer: JobOffer): void {
    // Rediriger vers la page de candidature
    window.location.href = `/candidate/apply/${jobOffer.id}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getRequiredSkills(jobOffer: JobOffer): any[] {
    // Gérer différentes structures de données
    if (jobOffer.jobDescription?.requiredSkills) {
      return jobOffer.jobDescription.requiredSkills;
    }
    if (jobOffer.required_skills) {
      return jobOffer.required_skills;
    }
    return [];
  }

  getSkillName(skill: any): string {
    return skill?.Skill?.name || skill?.name || 'Compétence non définie';
  }

  getSkillLevel(skill: any): string {
    return skill?.SkillLevel?.level_name || skill?.level_name || 'Niveau non défini';
  }
}