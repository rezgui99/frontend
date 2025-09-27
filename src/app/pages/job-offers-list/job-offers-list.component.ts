import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JobOfferService, JobOffer, JobOfferFilters } from '../../services/job-offer.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-job-offers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './job-offers-list.component.html',
  styleUrls: ['./job-offers-list.component.css']
})
export class JobOffersListComponent implements OnInit {
  jobOffers: JobOffer[] = [];
  filteredJobOffers: JobOffer[] = [];
  loading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Filtres
  filters: JobOfferFilters = {};
  searchQuery: string = '';
  selectedStatus: string = '';
  selectedContractType: string = '';

  // Options pour les filtres
  contractTypes = ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'];
  statusOptions = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'published', label: 'Publiée' },
    { value: 'closed', label: 'Fermée' }
  ];

  constructor(
    private jobOfferService: JobOfferService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadJobOffers();
  }

  loadJobOffers(): void {
    this.loading = true;
    this.errorMessage = null;

    // Construire les filtres
    const filters: JobOfferFilters = {};
    if (this.searchQuery) filters.search = this.searchQuery;
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.selectedContractType) filters.contract_type = this.selectedContractType;

    this.jobOfferService.getJobOffers(filters).subscribe({
      next: (jobOffers) => {
        // Gérer la réponse qui peut être un objet avec pagination ou un array direct
        if (Array.isArray(jobOffers)) {
          this.jobOffers = jobOffers;
        } else if (jobOffers && (jobOffers as any).jobOffers) {
          this.jobOffers = (jobOffers as any).jobOffers;
        } else {
          this.jobOffers = [];
        }
        this.filteredJobOffers = [...jobOffers];
        this.loading = false;
        console.log('Job offers loaded:', jobOffers);
      },
      error: (err) => {
        console.error('Error loading job offers:', err);
        this.errorMessage = 'Erreur lors du chargement des offres d\'emploi.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadJobOffers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedContractType = '';
    this.filters = {};
    this.loadJobOffers();
  }

  publishJobOffer(jobOffer: JobOffer): void {
    if (window.confirm(`Publier l'offre "${jobOffer.title}" ?`)) {
      this.jobOfferService.publishJobOffer(jobOffer.id!).subscribe({
        next: (updatedOffer) => {
          const index = this.jobOffers.findIndex(jo => jo.id === updatedOffer.id);
          if (index !== -1) {
            this.jobOffers[index] = updatedOffer;
          }
          this.successMessage = 'Offre publiée avec succès !';
          this.loadJobOffers();
        },
        error: (err) => {
          console.error('Error publishing job offer:', err);
          this.errorMessage = 'Erreur lors de la publication.';
        }
      });
    }
  }

  closeJobOffer(jobOffer: JobOffer): void {
    if (window.confirm(`Fermer l'offre "${jobOffer.title}" ?`)) {
      this.jobOfferService.closeJobOffer(jobOffer.id!).subscribe({
        next: (updatedOffer) => {
          const index = this.jobOffers.findIndex(jo => jo.id === updatedOffer.id);
          if (index !== -1) {
            this.jobOffers[index] = updatedOffer;
          }
          this.successMessage = 'Offre fermée avec succès !';
          this.loadJobOffers();
        },
        error: (err) => {
          console.error('Error closing job offer:', err);
          this.errorMessage = 'Erreur lors de la fermeture.';
        }
      });
    }
  }

  duplicateJobOffer(jobOffer: JobOffer): void {
    this.jobOfferService.duplicateJobOffer(jobOffer.id!).subscribe({
      next: (duplicatedOffer) => {
        this.jobOffers.unshift(duplicatedOffer);
        this.successMessage = 'Offre dupliquée avec succès !';
        this.loadJobOffers();
      },
      error: (err) => {
        console.error('Error duplicating job offer:', err);
        this.errorMessage = 'Erreur lors de la duplication.';
      }
    });
  }

  deleteJobOffer(jobOffer: JobOffer): void {
    const confirmMessage = `🗑️ Supprimer définitivement l'offre "${jobOffer.title}" ?\n\n` +
      `⚠️ Cette action est irréversible\n` +
      `⚠️ Toutes les candidatures associées seront perdues\n` +
      `⚠️ L'offre disparaîtra de tous les sites de publication`;
    
    if (window.confirm(confirmMessage)) {
      this.jobOfferService.deleteJobOffer(jobOffer.id!).subscribe({
        next: () => {
          this.jobOffers = this.jobOffers.filter(jo => jo.id !== jobOffer.id);
          this.successMessage = `🗑️ Offre "${jobOffer.title}" supprimée définitivement !`;
          
          // Effacer le message après 5 secondes
          setTimeout(() => {
            this.successMessage = null;
          }, 5000);
        },
        error: (err) => {
          console.error('Error deleting job offer:', err);
          this.errorMessage = `❌ Erreur lors de la suppression: ${err.error?.message || err.message}`;
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'published': return 'Publiée';
      case 'closed': return 'Fermée';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  get isHR(): boolean {
    return this.authService.isHR;
  }

  get currentUserId(): number | null {
    return this.authService.currentUser?.id || null;
  }

  canEditOffer(jobOffer: JobOffer): boolean {
    return this.authService.isAdmin || jobOffer.created_by === this.currentUserId;
  }
}