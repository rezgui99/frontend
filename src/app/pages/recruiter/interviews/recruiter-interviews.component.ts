import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InterviewService, Interview, InterviewFilters, InterviewStatistics } from '../../../services/interview.service';

@Component({
  selector: 'app-recruiter-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recruiter-interviews.component.html',
  styleUrls: ['./recruiter-interviews.component.css']
})
export class RecruiterInterviewsComponent implements OnInit {
  interviews: Interview[] = [];
  statistics: InterviewStatistics = {
    total_interviews: 0,
    upcoming_interviews: 0,
    status_breakdown: {} as any,
    type_breakdown: {} as any,
    interviewer_breakdown: [],
    average_score: null
  };
  
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
  
  // Nouveaux modals pour les documents
  showInterviewCoverLetterModal = false;
  selectedInterviewForCoverLetter: Interview | null = null;

  // Options
  statusOptions = [
    { value: 'scheduled', label: 'Programmé' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' },
    { value: 'rescheduled', label: 'Reprogrammé' }
  ];

  typeOptions = [
    { value: 'phone', label: 'Téléphonique' },
    { value: 'video', label: 'Vidéo' },
    { value: 'in_person', label: 'En personne' },
    { value: 'technical', label: 'Technique' },
    { value: 'hr', label: 'RH' },
    { value: 'final', label: 'Final' }
  ];

  interviewTypeLabels: any = {};

  constructor(
    private interviewService: InterviewService,
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
      next: (response) => {
        this.interviews = response.interviews || [];
        this.pagination = response.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading interviews:', error);
        this.interviews = this.getMockInterviews();
        this.pagination = {
          total: this.interviews.length,
          page: 1,
          limit: 20,
          totalPages: 1
        };
        this.loading = false;
      }
    });
  }

  getMockInterviews(): Interview[] {
    return [
      {
        id: 1,
        application_id: 1,
        interviewer_id: 1,
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60,
        interview_type: 'video',
        status: 'scheduled',
        meeting_link: 'https://meet.google.com/abc-defg-hij',
        notes: 'Entretien technique avec focus sur React/Node.js',
        decision: 'pending',
        reminder_sent: false,
        application: {
          candidate: {
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@email.com',
            phone: '+33 1 23 45 67 89'
          },
          jobOffer: {
            title: 'Développeur Full Stack',
            company: 'TechCorp'
          }
        },
        interviewer: {
          firstName: 'Marie',
          lastName: 'Martin',
          email: 'marie.martin@company.com'
        }
      }
    ];
  }

  loadStatistics(): void {
    this.interviewService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadInterviewTypeLabels(): void {
    this.interviewService.getInterviewTypeLabels().subscribe({
      next: (labels) => {
        this.interviewTypeLabels = labels;
      },
      error: (error) => {
        console.error('Error loading interview type labels:', error);
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

  // Modal methods
  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.scheduleForm.reset({
      duration_minutes: 60,
      interview_type: 'video'
    });
  }

  onScheduleSubmit(): void {
    if (this.scheduleForm.valid) {
      this.scheduling = true;
      
      this.interviewService.scheduleInterview(this.scheduleForm.value).subscribe({
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

  // Interview actions
  confirmInterview(interview: Interview): void {
    this.interviewService.updateInterview(interview.id!, { status: 'confirmed' }).subscribe({
      next: () => {
        this.loadInterviews();
      },
      error: (error) => {
        console.error('Error confirming interview:', error);
      }
    });
  }

  cancelInterview(interview: Interview): void {
    const reason = prompt('Raison de l\'annulation:');
    if (reason) {
      this.interviewService.cancelInterview(interview.id!, reason).subscribe({
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
    const newDate = prompt('Nouvelle date et heure (YYYY-MM-DD HH:MM):');
    const reason = prompt('Raison de la reprogrammation:');
    
    if (newDate && reason) {
      this.interviewService.rescheduleInterview(interview.id!, {
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
    const score = prompt('Score de l\'entretien (0-100):');
    const feedback = prompt('Feedback pour le candidat:');
    const decision = confirm('Candidat retenu ?') ? 'pass' : 'fail';
    
    if (score && feedback) {
      this.interviewService.completeInterview(interview.id!, {
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

  sendConfirmationEmail(interview: Interview): void {
    if (confirm('Envoyer un email de confirmation au candidat ?')) {
      this.interviewService.sendInterviewConfirmation(interview.id!).subscribe({
        next: () => {
          alert('Email de confirmation envoyé avec succès');
        },
        error: (error) => {
          console.error('Error sending confirmation email:', error);
          alert('Erreur lors de l\'envoi de l\'email');
        }
      });
    }
  }

  showEditModal(interview: Interview): void {
    // TODO: Implémenter modal d'édition complet
    console.log('Edit interview:', interview);
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rescheduled': 'bg-orange-100 text-orange-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels = {
      'scheduled': 'Programmé',
      'confirmed': 'Confirmé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'rescheduled': 'Reprogrammé'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getTypeLabel(type: string): string {
    return this.interviewTypeLabels[type] || type;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  }

  // Télécharger CV depuis un entretien
  downloadCVFromInterview(interviewId: number, cvId: number): void {
    window.open(`http://localhost:3000/api/interviews/${interviewId}/cv/${cvId}/download`, '_blank');
  }

  // Voir la lettre de motivation depuis un entretien
  showCoverLetterForInterview(interview: Interview): void {
    this.selectedInterviewForCoverLetter = interview;
    this.showInterviewCoverLetterModal = true;
  }

  closeInterviewCoverLetterModal(): void {
    this.showInterviewCoverLetterModal = false;
    this.selectedInterviewForCoverLetter = null;
  }


}