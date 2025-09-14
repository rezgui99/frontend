import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Application, JobOffer } from '../../../models/candidate.model';
import { RecruiterApplicationsService, ApplicationsResponse, ApplicationStatistics } from '../../../services/recruiter-applications.service';
import { JobOfferService } from '../../../services/job-offer.service';
import { AvailableApplication } from '../../../models/interview.model';

// Interface pour le service de job offer
interface JobOfferServiceResponse {
  jobOffers?: JobOffer[];
  // autres propriétés possibles
  [key: string]: any;
}

@Component({
  selector: 'app-recruiter-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recruiter-applications.component.html',
  styleUrls: ['./recruiter-applications.component.css']
})
export class RecruiterApplicationsComponent implements OnInit {
  applications: Application[] = [];
  jobOffers: JobOffer[] = [];
  loading = false;
  scheduling = false;
  
  filters = {
    search: '',
    job_offer_id: '',
    status: '',
    page: 1,
    limit: 20
  };

  pagination = {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  };

  statistics: ApplicationStatistics | null = null;

  statusOptions: { value: string; label: string }[] = [
    { value: 'applied', label: 'Postulé' },
    { value: 'under_review', label: 'En examen' },
    { value: 'interview_scheduled', label: 'Entretien programmé' },
    { value: 'interview_completed', label: 'Entretien terminé' },
    { value: 'accepted', label: 'Accepté' },
    { value: 'rejected', label: 'Rejeté' }
  ];

  selectedApplications = new Set<number>();
  bulkAction: { status: string; notes: string } = {
    status: '',
    notes: ''
  };

  // Modal states
  showScheduleInterviewModal = false;
  selectedApplication: Application | null = null;
  scheduleForm: FormGroup;
  
  // Nouveaux modals
  showCoverLetterModal = false;
  showApplicationDetailsModal = false;
  selectedApplicationForCoverLetter: Application | null = null;
  selectedApplicationDetails: Application | null = null;
  
  // Propriété pour les applications disponibles
  availableApplications: AvailableApplication[] = [];

  constructor(
    private recruiterService: RecruiterApplicationsService,
    private jobOfferService: JobOfferService,
    private formBuilder: FormBuilder
  ) {
    this.scheduleForm = this.formBuilder.group({
      confirmed_interview_date: ['', Validators.required],
      interview_type: ['video', Validators.required],
      location: [''],
      meeting_link: [''],
      recruiter_notes: ['']
    });
  }

  ngOnInit(): void {
    // Test de connectivité d'abord
    this.testConnection();
    
    this.loadApplications();
    this.loadJobOffers();
    this.loadStatistics();
  }

  testConnection(): void {
    console.log('🧪 Testing recruiter applications service connection...');
    this.recruiterService.testConnection().subscribe({
      next: (response) => {
        console.log('✅ Connection test successful:', response);
      },
      error: (error) => {
        console.error('❌ Connection test failed:', error);
        console.error('This indicates a problem with the backend route or authentication');
      }
    });
  }

  loadApplications(): void {
    this.loading = true;
    console.log('🔍 Loading applications with filters:', this.filters);
    
    this.recruiterService.getAllApplications(this.filters).subscribe({
      next: (response: ApplicationsResponse) => {
        console.log('📋 Applications response:', response);
        this.applications = response.applications || [];
        this.pagination = response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        
        // Gestion spécifique des erreurs
        if (error.status === 500) {
          console.error('❌ Server error - Check backend logs');
        } else if (error.status === 0) {
          console.error('❌ Network error - Backend may be down');
        }
        
        this.loading = false;
      }
    });
  }

  loadJobOffers(): void {
    this.jobOfferService.getJobOffers().subscribe({
      next: (response: JobOfferServiceResponse | JobOffer[]) => {
        // Gestion correcte des types avec conversion
        if (Array.isArray(response)) {
          // Si c'est déjà un array, on le convertit
          this.jobOffers = this.convertJobOffers(response);
        } else if (response && 'jobOffers' in response) {
          // Si c'est un objet avec une propriété jobOffers
          this.jobOffers = this.convertJobOffers((response as JobOfferServiceResponse).jobOffers || []);
        } else {
          this.jobOffers = [];
        }
      },
      error: (error) => {
        console.error('Error loading job offers:', error);
        this.jobOffers = [];
      }
    });
  }

  // Méthode pour convertir les jobOffers du service vers le modèle candidat
  private convertJobOffers(serviceJobOffers: any[]): JobOffer[] {
    return (serviceJobOffers || []).map(jo => ({
      ...jo,
      created_at: jo.created_at || jo.createdAt || new Date().toISOString(),
      updated_at: jo.updated_at || jo.updatedAt || new Date().toISOString()
    }));
  }

  loadStatistics(): void {
    this.recruiterService.getApplicationStatistics().subscribe({
      next: (stats: ApplicationStatistics) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.statistics = {
          totalApplications: 0,
          statusBreakdown: {},
          recentApplications: 0,
          interviewsScheduled: 0
        };
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadApplications();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      job_offer_id: '',
      status: '',
      page: 1,
      limit: 20
    };
    this.loadApplications();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadApplications();
    }
  }

  getStartIndex(): number {
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  getEndIndex(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
  }

  // Selection methods
  isSelected(applicationId: number): boolean {
    return this.selectedApplications.has(applicationId);
  }

  toggleSelection(applicationId: number): void {
    if (this.selectedApplications.has(applicationId)) {
      this.selectedApplications.delete(applicationId);
    } else {
      this.selectedApplications.add(applicationId);
    }
  }

  selectAll(): void {
    if (this.allSelected) {
      this.selectedApplications.clear();
    } else {
      this.applications.forEach(app => this.selectedApplications.add(app.id!));
    }
  }

  get allSelected(): boolean {
    return this.applications.length > 0 && this.selectedApplications.size === this.applications.length;
  }

  get someSelected(): boolean {
    return this.selectedApplications.size > 0 && this.selectedApplications.size < this.applications.length;
  }

  // Status management
  updateStatus(application: Application, status: string): void {
    if (!application.id) return;
    
    this.recruiterService.updateApplicationStatus(application.id, status).subscribe({
      next: () => {
        application.status = status as any;
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error updating status:', error);
      }
    });
  }

  performBulkAction(): void {
    if (!this.bulkAction.status || this.selectedApplications.size === 0) return;

    const applicationIds = Array.from(this.selectedApplications);
    
    this.recruiterService.bulkUpdateApplications(
      applicationIds, 
      this.bulkAction.status, 
      this.bulkAction.notes
    ).subscribe({
      next: () => {
        this.selectedApplications.clear();
        this.bulkAction = { status: '', notes: '' };
        this.loadApplications();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error performing bulk action:', error);
      }
    });
  }

  // Interview scheduling
  showScheduleModal(application: Application): void {
    this.selectedApplication = application;
    this.showScheduleInterviewModal = true;
    this.scheduleForm.reset();
  }

  scheduleInterview(application: Application, slot: string): void {
    this.selectedApplication = application;
    this.showScheduleInterviewModal = true;
    this.scheduleForm.reset();
  }

  confirmScheduleInterview(): void {
    if (this.scheduleForm.invalid || !this.selectedApplication) return;

    this.scheduling = true;
    
    this.recruiterService.scheduleInterview(
      this.selectedApplication.id!,
      this.scheduleForm.value
    ).subscribe({
      next: () => {
        this.closeScheduleModal();
        this.loadApplications();
        this.loadStatistics();
        this.scheduling = false;
      },
      error: (error) => {
        console.error('Error scheduling interview:', error);
        this.scheduling = false;
      }
    });
  }

  onInterviewTypeChange(): void {
    const interviewType = this.scheduleForm.get('interview_type')?.value;
    
    // Réinitialiser les champs selon le type
    if (interviewType === 'phone') {
      this.scheduleForm.patchValue({
        meeting_link: '',
        location: ''
      });
    } else if (interviewType === 'in_person') {
      this.scheduleForm.patchValue({
        meeting_link: ''
      });
    } else if (interviewType === 'video') {
      this.scheduleForm.patchValue({
        location: ''
      });
    }
  }

  closeScheduleModal(): void {
    this.showScheduleInterviewModal = false;
    this.selectedApplication = null;
    this.scheduleForm.reset({
      interview_type: 'video'
    });
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
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
    const labels: { [key: string]: string } = {
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

  downloadCV(cvId: number): void {
    this.recruiterService.downloadCV(cvId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cv-candidat-${cvId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading CV:', error);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showFullCoverLetter(application: Application): void {
    this.selectedApplicationForCoverLetter = application;
    this.showCoverLetterModal = true;
  }

  closeCoverLetterModal(): void {
    this.showCoverLetterModal = false;
    this.selectedApplicationForCoverLetter = null;
  }

  viewApplicationDetails(application: Application): void {
    if (!application.id) return;
    
    // Charger les détails complets de la candidature
    this.recruiterService.getApplicationDetails(application.id).subscribe({
      next: (details) => {
        this.selectedApplicationDetails = details;
        this.showApplicationDetailsModal = true;
      },
      error: (error) => {
        console.error('Error loading application details:', error);
      }
    });
  }

  closeApplicationDetailsModal(): void {
    this.showApplicationDetailsModal = false;
    this.selectedApplicationDetails = null;
  }

  quickScheduleInterview(application: Application, slot: string): void {
    this.selectedApplication = application;
    this.showScheduleInterviewModal = true;
    this.scheduleForm.reset();
  }

  showNotesModal(application: Application): void {
    if (!application.id) return;
    
    const notes = prompt('Ajouter des notes pour cette candidature:', application.recruiter_notes || '');
    if (notes !== null) {
      this.recruiterService.updateApplicationStatus(application.id, application.status, notes).subscribe({
        next: () => {
          application.recruiter_notes = notes;
        },
        error: (error) => {
          console.error('Error updating notes:', error);
        }
      });
    }
  }

  loadAvailableApplications(): void {
    console.log('🔍 Loading available applications for interview...');
    
    this.recruiterService.getAvailableApplicationsForInterview().subscribe({
      next: (applications: AvailableApplication[]) => {
        console.log('📋 Available applications response:', applications);
        this.availableApplications = applications;
        console.log('✅ Available applications loaded:', this.availableApplications.length);
      },
      error: (error) => {
        console.error('Error loading available applications:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        this.availableApplications = [];
      }
    });
  }
  
  // Getters pour les statistiques avec protection null
  get totalApplications(): number {
    return this.statistics?.totalApplications || 0;
  }

  get statusBreakdown(): { [key: string]: number } {
    return this.statistics?.statusBreakdown || {};
  }

  get recentApplications(): number {
    return this.statistics?.recentApplications || 0;
  }

  get interviewsScheduled(): number {
    return this.statistics?.interviewsScheduled || 0;
  }

  // Méthode pour accéder aux statistiques de statut de manière sécurisée
  getStatusCount(status: string): number {
    return this.statusBreakdown[status] || 0;
  }
}