import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Application, JobOffer } from '../../../models/candidate.model';
import { RecruiterApplicationsService } from '../../../services/recruiter-applications.service';
import { JobOfferService } from '../../../services/job-offer.service';

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

  statistics = {
    totalApplications: 0,
    statusBreakdown: {} as any,
    recentApplications: 0,
    interviewsScheduled: 0
  };

  statusOptions = [
    { value: 'applied', label: 'Postulé' },
    { value: 'under_review', label: 'En examen' },
    { value: 'interview_scheduled', label: 'Entretien programmé' },
    { value: 'interview_completed', label: 'Entretien terminé' },
    { value: 'accepted', label: 'Accepté' },
    { value: 'rejected', label: 'Rejeté' }
  ];

  selectedApplications = new Set<number>();
  bulkAction = {
    status: '',
    notes: ''
  };

  // Modal states
  showScheduleInterviewModal = false;
  selectedApplication: Application | null = null;
  scheduleForm: FormGroup;

  constructor(
    private recruiterService: RecruiterApplicationsService,
    private jobOfferService: JobOfferService,
    private formBuilder: FormBuilder
  ) {
    this.scheduleForm = this.formBuilder.group({
      confirmed_interview_date: ['', Validators.required],
      interview_link: [''],
      recruiter_notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadApplications();
    this.loadJobOffers();
    this.loadStatistics();
  }

  loadApplications(): void {
    this.loading = true;
    
    this.recruiterService.getAllApplications(this.filters).subscribe({
      next: (response) => {
        this.applications = response.applications;
        this.pagination = response.pagination;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
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
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
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
    this.recruiterService.updateApplicationStatus(application.id!, status).subscribe({
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
    this.scheduleForm.patchValue({
      confirmed_interview_date: new Date(slot).toISOString().slice(0, 16)
    });
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

  closeScheduleModal(): void {
    this.showScheduleInterviewModal = false;
    this.selectedApplication = null;
    this.scheduleForm.reset();
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  }

  // Utility methods
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

  downloadCV(cvId: number): void {
    // Implementation would require a service method to download CV by ID
    console.log('Download CV:', cvId);
  }

  showNotesModal(application: Application): void {
    const notes = prompt('Ajouter des notes pour cette candidature:', application.recruiter_notes || '');
    if (notes !== null) {
      this.recruiterService.updateApplicationStatus(application.id!, application.status, notes).subscribe({
        next: () => {
          application.recruiter_notes = notes;
        },
        error: (error) => {
          console.error('Error updating notes:', error);
        }
      });
    }
  }
}