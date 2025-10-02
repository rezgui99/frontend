import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { CandidateCV } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-cvs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-cvs.component.html',
  styleUrls: ['./candidate-cvs.component.css']
})
export class CandidateCVsComponent implements OnInit {
  cvs: CandidateCV[] = [];
  loading = false;
  uploading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  showUploadForm = false;
  selectedFile: File | null = null;
  cvTitle = '';

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.loadCVs();
  }

  loadCVs(): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getCVs().subscribe({
      next: (cvs) => {
        this.cvs = cvs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading CVs:', error);
        this.errorMessage = 'Erreur lors du chargement des CVs';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Seuls les fichiers PDF, DOC et DOCX sont acceptés';
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = 'La taille du fichier ne doit pas dépasser 10MB';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = null;
      
      // Générer un titre par défaut
      if (!this.cvTitle) {
        this.cvTitle = `CV ${new Date().toLocaleDateString('fr-FR')}`;
      }
    }
  }

  uploadCV(): void {
    if (!this.selectedFile || !this.cvTitle.trim()) {
      this.errorMessage = 'Veuillez sélectionner un fichier et saisir un titre';
      return;
    }

    this.uploading = true;
    this.errorMessage = null;

    const formData = new FormData();
    formData.append('cv_file', this.selectedFile);
    formData.append('title', this.cvTitle.trim());
    formData.append('is_primary', this.cvs.length === 0 ? 'true' : 'false');

    this.candidateService.uploadCV(formData).subscribe({
      next: (cv) => {
        this.cvs.unshift(cv);
        this.successMessage = 'CV uploadé avec succès';
        this.resetUploadForm();
        this.uploading = false;
      },
      error: (error) => {
        console.error('Error uploading CV:', error);
        this.errorMessage = error.message || 'Erreur lors de l\'upload du CV';
        this.uploading = false;
      }
    });
  }

  setPrimaryCV(cv: CandidateCV): void {
    if (cv.is_primary) return;

    this.candidateService.setPrimaryCV(cv.id!).subscribe({
      next: () => {
        // Mettre à jour localement
        this.cvs.forEach(c => c.is_primary = false);
        cv.is_primary = true;
        this.successMessage = 'CV défini comme principal';
      },
      error: (error) => {
        console.error('Error setting primary CV:', error);
        this.errorMessage = 'Erreur lors de la définition du CV principal';
      }
    });
  }

  deleteCV(cv: CandidateCV): void {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le CV "${cv.title}" ?`)) {
      return;
    }

    this.candidateService.deleteCV(cv.id!).subscribe({
      next: () => {
        this.cvs = this.cvs.filter(c => c.id !== cv.id);
        this.successMessage = 'CV supprimé avec succès';
      },
      error: (error) => {
        console.error('Error deleting CV:', error);
        this.errorMessage = error.message || 'Erreur lors de la suppression du CV';
      }
    });
  }

  downloadCV(cv: CandidateCV): void {
    this.candidateService.downloadCV(cv.id!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = cv.file_name;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading CV:', error);
        this.errorMessage = 'Erreur lors du téléchargement du CV';
      }
    });
  }

  resetUploadForm(): void {
    this.showUploadForm = false;
    this.selectedFile = null;
    this.cvTitle = '';
    const fileInput = document.getElementById('cv_file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}