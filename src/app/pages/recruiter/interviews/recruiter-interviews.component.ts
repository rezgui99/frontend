import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InterviewService } from '../../../services/interview.service';
import { RecruiterApplicationsService } from '../../../services/recruiter-applications.service';
import { 
  Interview, 
  InterviewFilters, 
  InterviewStatistics, 
  CreateInterviewRequest,
  InterviewsResponse,
  AvailableApplication,
  InterviewType,
  InterviewStatus,
  InterviewDecision
} from '../../../models/candidate.model';

@Component({
  selector: 'app-recruiter-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recruiter-interviews.component.html',
  styleUrls: ['./recruiter-interviews.component.css']
})
export class RecruiterInterviewsComponent implements OnInit {
  interviews: Interview[] = [];
  statistics: InterviewStatistics | null = null;
  
  loading = false;
  scheduling = false;
  
  filters: InterviewFilters = {
    page: 1,
    limit: 20
  };

  pagination = {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  };

  // Modal states
  showScheduleModal = false;
  scheduleForm: FormGroup;
  
  // Modals pour les documents
  showInterviewCoverLetterModal = false;
  showInterviewDetailsModal = false;
  selectedInterviewForCoverLetter: Interview | null = null;
  selectedInterviewDetails: Interview | null = null;
  selectedApplicationForSchedule: AvailableApplication | null = null;

  // Applications disponibles pour programmer des entretiens
  availableApplications: AvailableApplication[] = [];
  loadingApplications = false;
  
  // Options
  statusOptions: { value: InterviewStatus; label: string }[] = [
    { value: 'scheduled', label: 'Programmé' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' },
    { value: 'rescheduled', label: 'Reprogrammé' }
  ];

  typeOptions: { value: InterviewType; label: string }[] = [
    { value: 'phone', label: 'Téléphonique' },
    { value: 'video', label: 'Vidéo' },
    { value: 'in_person', label: 'En personne' },
    { value: 'technical', label: 'Technique' },
    { value: 'hr', label: 'RH' },
    { value: 'final', label: 'Final' }
  ];

  interviewTypeLabels: { [key: string]: string } = {};

  constructor(
    private interviewService: InterviewService,
    private recruiterApplicationsService: RecruiterApplicationsService,
    private formBuilder: FormBuilder
  ) {
    this.scheduleForm = this.formBuilder.group({
      application_id: ['', Validators.required],
      scheduled_date: ['', Validators.required],
      duration_minutes: [60, [Validators.required, Validators.min(15), Validators.max(240)]],
      interview_type: ['video', Validators.required],
      location: [''],
      meeting_link: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadInterviews();
    this.loadStatistics();
    this.loadInterviewTypeLabels();
  }

  loadInterviews(): void {
    this.loading = true;
    
    this.interviewService.getInterviews(this.filters).subscribe({
      next: (response: InterviewsResponse | Interview[]) => {
        if (Array.isArray(response)) {
          this.interviews = response;
          this.pagination = {
            total: response.length,
            page: 1,
            limit: response.length,
            totalPages: 1
          };
        } else {
          this.interviews = response.interviews || [];
          this.pagination = response.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0
          };
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading interviews:', error);
        this.interviews = [];
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.interviewService.getStatistics().subscribe({
      next: (stats: InterviewStatistics) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.statistics = {
          total_interviews: 0,
          upcoming_interviews: 0,
          status_breakdown: {} as { [key in InterviewStatus]: number },
          type_breakdown: {} as { [key in InterviewType]: number },
          interviewer_breakdown: [],
          average_score: null
        };
      }
    });
  }

  loadInterviewTypeLabels(): void {
    this.interviewService.getInterviewTypeLabels().subscribe({
      next: (labels: { [key: string]: string }) => {
        this.interviewTypeLabels = labels;
      },
      error: (error) => {
        console.error('Error loading interview type labels:', error);
        this.interviewTypeLabels = {
          phone: 'Téléphonique',
          video: 'Vidéo',
          in_person: 'En personne',
          technical: 'Technique',
          hr: 'RH',
          final: 'Final'
        };
      }
    });
  }

  loadAvailableApplications(): void {
    this.loadingApplications = true;
    
    this.recruiterApplicationsService.getAvailableApplicationsForInterview().subscribe({
      next: (applications: AvailableApplication[]) => {
        this.availableApplications = applications || [];
        this.loadingApplications = false;
      },
      error: (error) => {
        console.error('Error loading available applications:', error);
        this.availableApplications = [];
        this.loadingApplications = false;
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadInterviews();
  }

  clearFilters(): void {
    this.filters = {
      page: 1,
      limit: 20
    };
    this.loadInterviews();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadInterviews();
    }
  }

  getStartIndex(): number {
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  getEndIndex(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
  }

  onApplicationSelect(): void {
    const applicationId = this.scheduleForm.get('application_id')?.value;
    if (applicationId) {
      this.selectedApplicationForSchedule = this.availableApplications.find(
        app => app.id === parseInt(applicationId)
      ) || null;
    }
  }

  onScheduleSubmit(): void {
    if (this.scheduleForm.valid) {
      this.scheduling = true;
      
      const interviewData: CreateInterviewRequest = this.scheduleForm.value;
      
      this.interviewService.scheduleInterview(interviewData).subscribe({
        next: () => {
          this.closeScheduleModal();
          this.loadInterviews();
          this.loadStatistics();
          this.scheduling = false;
        },
        error: (error) => {
          console.error('Error scheduling interview:', error);
          this.scheduling = false;
        }
      });
    }
  }

  onInterviewTypeChange(): void {
    const interviewType = this.scheduleForm.get('interview_type')?.value;
    
    // Réinitialiser les champs selon le type
    if (interviewType === 'phone') {
      this.scheduleForm.patchValue({
        location: '',
        meeting_link: ''
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
    this.showScheduleModal = false;
    this.selectedApplicationForSchedule = null;
    this.scheduleForm.reset({
      duration_minutes: 60,
      interview_type: 'video'
    });
  }

  // Interview actions
  confirmInterview(interview: Interview): void {
    if (!interview.id) return;
    
    this.interviewService.updateInterview(interview.id, { status: 'confirmed' }).subscribe({
      next: () => {
        this.loadInterviews();
      },
      error: (error) => {
        console.error('Error confirming interview:', error);
      }
    });
  }

  cancelInterview(interview: Interview): void {
    if (!interview.id) return;
    
    const reason = prompt('Raison de l\'annulation:');
    if (reason) {
      this.interviewService.cancelInterview(interview.id, reason).subscribe({
        next: () => {
          this.loadInterviews();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error cancelling interview:', error);
        }
      });
    }
  }

  showRescheduleModal(interview: Interview): void {
    if (!interview.id) return;
    
    const newDate = prompt('Nouvelle date et heure (YYYY-MM-DD HH:MM):');
    const reason = prompt('Raison de la reprogrammation:');
    
    if (newDate && reason) {
      this.interviewService.rescheduleInterview(interview.id, {
        new_scheduled_date: newDate,
        reason
      }).subscribe({
        next: () => {
          this.loadInterviews();
        },
        error: (error) => {
          console.error('Error rescheduling interview:', error);
        }
      });
    }
  }

  showCompleteModal(interview: Interview): void {
    if (!interview.id) return;
    
    const score = prompt('Score de l\'entretien (0-100):');
    const feedback = prompt('Feedback pour le candidat:');
    const decision = confirm('Candidat retenu ?') ? 'pass' : 'fail';
    
    if (score && feedback) {
      this.interviewService.completeInterview(interview.id, {
        score: parseInt(score),
        feedback,
        decision
      }).subscribe({
        next: () => {
          this.loadInterviews();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error completing interview:', error);
        }
      });
    }
  }

  showEditModal(interview: Interview): void {
    console.log('Edit interview:', interview);
    // TODO: Implémenter modal d'édition complet
  }

  // Document methods
  showCoverLetterForInterview(interview: Interview): void {
    this.selectedInterviewForCoverLetter = interview;
    this.showInterviewCoverLetterModal = true;
  }

  closeInterviewCoverLetterModal(): void {
    this.showInterviewCoverLetterModal = false;
    this.selectedInterviewForCoverLetter = null;
  }

  viewInterviewDetails(interview: Interview): void {
    this.selectedInterviewDetails = interview;
    this.showInterviewDetailsModal = true;
  }

  closeInterviewDetailsModal(): void {
    this.showInterviewDetailsModal = false;
    this.selectedInterviewDetails = null;
  }

  downloadCVFromInterview(interviewId: number, cvId: number): void {
    this.interviewService.downloadCVFromInterview(interviewId, cvId).subscribe({
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

  // Utility methods
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rescheduled': 'bg-orange-100 text-orange-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'scheduled': 'Programmé',
      'confirmed': 'Confirmé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'rescheduled': 'Reprogrammé'
    };
    return labels[status] || status;
  }

  getTypeLabel(type: string): string {
    return this.interviewTypeLabels[type] || type;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return '';
    }
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return '';
    }
  }

  formatFileSize(size?: number): string {
    if (!size || size === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
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

  // Getters pour les statistiques avec protection null
  get totalInterviews(): number {
    return this.statistics?.total_interviews || 0;
  }

  get upcomingInterviews(): number {
    return this.statistics?.upcoming_interviews || 0;
  }

  get statusBreakdown(): { [key in InterviewStatus]: number } {
    return this.statistics?.status_breakdown || {} as { [key in InterviewStatus]: number };
  }

  get typeBreakdown(): { [key in InterviewType]: number } {
    return this.statistics?.type_breakdown || {} as { [key in InterviewType]: number };
  }

  get averageScore(): number {
    return this.statistics?.average_score || 0;
  }

  // Méthodes pour accéder aux statistiques de manière sécurisée
  getStatusCount(status: InterviewStatus): number {
    return this.statusBreakdown[status] || 0;
  }

  getTypeCount(type: InterviewType): number {
    return this.typeBreakdown[type] || 0;
  }
}