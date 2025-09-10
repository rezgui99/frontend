import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { Application } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-applications.component.html',
  styleUrls: ['./candidate-applications.component.css']
})
export class CandidateApplicationsComponent implements OnInit {
  applications: Application[] = [];
  filteredApplications: Application[] = [];
  loading = false;
  errorMessage: string | null = null;
  
  selectedStatus = '';
  statusOptions = [
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
        this.applications = applications;
        this.filteredApplications = applications;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.errorMessage = 'Erreur lors du chargement de vos candidatures';
        this.loading = false;
      }
    });
  }

  onStatusChange(): void {
    this.loadApplications();
  }

  withdrawApplication(application: Application): void {
    const confirmMessage = `Êtes-vous sûr de vouloir retirer votre candidature pour "${application.jobOffer?.title || application.JobOffer?.title}" ?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    this.candidateService.withdrawApplication(application.id!).subscribe({
      next: () => {
        this.applications = this.applications.filter(app => app.id !== application.id);
        this.filteredApplications = this.filteredApplications.filter(app => app.id !== application.id);
      },
      error: (error) => {
        console.error('Error withdrawing application:', error);
        this.errorMessage = error.message || 'Erreur lors du retrait de la candidature';
      }
    });
  }

  canWithdraw(application: Application): boolean {
    return !['accepted', 'rejected', 'interview_completed'].includes(application.status);
  }

  getStatusClass(status: string): string {
    const classes = {
      'applied': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'interview_scheduled': 'bg-green-100 text-green-800',
      'interview_completed': 'bg-purple-100 text-purple-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels = {
      'applied': 'Postulé',
      'under_review': 'En examen',
      'interview_scheduled': 'Entretien programmé',
      'interview_completed': 'Entretien terminé',
      'accepted': 'Accepté',
      'rejected': 'Rejeté'
    };
    return labels[status as keyof typeof labels] || status;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }
}