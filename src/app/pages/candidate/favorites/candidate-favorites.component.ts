import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../services/candidate.service';
import { CandidateFavorite } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './candidate-favorites.component.html',
  styleUrls: ['./candidate-favorites.component.css']
})
export class CandidateFavoritesComponent implements OnInit {
  favorites: CandidateFavorite[] = [];
  loading = false;
  errorMessage: string | null = null;

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading = true;
    this.errorMessage = null;

    this.candidateService.getFavorites().subscribe({
      next: (favorites) => {
        this.favorites = favorites;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
        this.errorMessage = 'Erreur lors du chargement des favoris';
        this.loading = false;
      }
    });
  }

  removeFromFavorites(favorite: CandidateFavorite): void {
    if (!window.confirm('Retirer cette offre de vos favoris ?')) {
      return;
    }

    this.candidateService.removeFromFavorites(favorite.job_offer_id).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(f => f.id !== favorite.id);
      },
      error: (error) => {
        console.error('Error removing from favorites:', error);
        this.errorMessage = 'Erreur lors de la suppression du favori';
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}