import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/employee.model';
import { SkillBadgeComponent } from '../skill-badge/skill-badge.component';

@Component({
  selector: 'app-employee-card',
  standalone: true,
  imports: [CommonModule, SkillBadgeComponent],
  templateUrl: './employee-card.component.html',
  styleUrls: ['./employee-card.component.css']
})
export class EmployeeCardComponent {
  @Input() employee!: Employee;
  @Input() matchingScore?: number;
  showAllSkills: boolean = false;

  toggleSkills() {
    this.showAllSkills = !this.showAllSkills;
  }

  hasProfileImage(): boolean {
    return !!(this.employee.profile_picture && 
             this.employee.profile_picture.trim() !== '' && 
             !this.employee.profile_picture.includes('undefined') &&
             !this.employee.profile_picture.includes('null') &&
             this.employee.profile_picture !== 'null');
  }

  getProfileImage(): string {
    if (!this.employee.profile_picture) return '';
    
    if (this.employee.profile_picture.startsWith('http')) {
      return this.employee.profile_picture;
    }
    
    if (this.employee.profile_picture.startsWith('data:image')) {
      return this.employee.profile_picture;
    }
    
    const baseUrl = 'http://localhost:3000';
    const imagePath = this.employee.profile_picture.startsWith('/') ? 
                     this.employee.profile_picture : 
                     `/${this.employee.profile_picture}`;
    
    return `${baseUrl}${imagePath}`;
  }

  getInitials(): string {
    if (!this.employee.name) return '?';
    return this.employee.name.charAt(0).toUpperCase();
  }

  onImageError(event: any): void {
    console.warn(`Erreur de chargement d'image pour ${this.employee.name}`);
    event.target.style.display = 'none';
    // Forcer l'affichage des initiales
    const parentElement = event.target.parentElement;
    if (parentElement) {
      const spanElement = parentElement.querySelector('span');
      if (spanElement) {
        spanElement.style.display = 'block';
      }
    }
  }
}