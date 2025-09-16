import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { Application, ApplicationStatus, InterviewType } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-applications.component.html',
  styleUrls: ['./candidate-applications.component.css']
})
export class CandidateApplicationsComponent implements OnInit {
  applications: Application[] = [];
  loading = false;
  errorMessage: string | null = null;
  
  selectedStatus = '';
  statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'applied', label: 'Postulé' },
    { value: 'under_review', label: 'En examen' },
    { value: 'interview_scheduled', label: 'Entretien programmé' },
    { value: 'interview_completed', label: 'Entretien terminé' },
    { value: 'accepted', label: 'Accepté' },
    { value: 'rejected', label: 'Rejeté' }
  ];

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getMyApplications(this.selectedStatus || undefined).subscribe({
      next: (applications) => {
        this.applications = applications || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.errorMessage = error.message || 'Erreur lors du chargement de vos candidatures';
        this.loading = false;
      }
    });
  }

  onStatusChange(): void {
    this.loadApplications();
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'applied': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'interview_scheduled': 'bg-green-100 text-green-800',
      'interview_completed': 'bg-purple-100 text-purple-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'applied': 'Postulé',
      'under_review': 'En examen',
      'interview_scheduled': 'Entretien programmé',
      'interview_completed': 'Entretien terminé',
      'accepted': 'Accepté',
      'rejected': 'Rejeté'
    };
    return labels[status] || status;
  }

  canWithdrawApplication(application: Application): boolean {
    return ['applied', 'under_review'].includes(application.status);
  }

  withdrawApplication(application: Application): void {
    if (!application.id) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir retirer cette candidature ?')) {
      this.candidateService.withdrawApplication(application.id).subscribe({
        next: () => {
          this.loadApplications(); // Refresh la liste
        },
        error: (error) => {
          console.error('Error withdrawing application:', error);
          this.errorMessage = error.message || 'Erreur lors du retrait de la candidature';
        }
      });
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return '';
    }
  }

  formatDateTime(dateString?: string | Date | null): string {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return '—';
    }
  }

  getInterviewTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'phone': 'Téléphonique',
      'video': 'Vidéo',
      'in_person': 'En personne',
      'technical': 'Technique',
      'hr': 'RH',
      'final': 'Final'
    };
    return labels[type] || type;
  }

  // Méthodes utilitaires pour éviter les erreurs undefined
  safeGetJobOfferTitle(application: Application): string {
    return application?.jobOffer?.title || application?.JobOffer?.title || 'Poste non spécifié';
  }

  safeGetJobOfferCompany(application: Application): string {
    return application?.jobOffer?.company || application?.JobOffer?.company || 'Entreprise non spécifiée';
  }

  safeGetJobOfferLocation(application: Application): string {
    return application?.jobOffer?.location || application?.JobOffer?.location || 'Localisation non spécifiée';
  }

  safeGetCVTitle(application: Application): string {
    return application?.cv?.title || application?.CandidateCV?.title || '';
  }

  // Méthode pour obtenir le titre du CV (alias pour compatibilité)
  getCVTitle(application?: Application): string {
    if (!application) return 'CV non spécifié';
    return application?.cv?.title ?? application?.CandidateCV?.title ?? 'CV';
  }
}