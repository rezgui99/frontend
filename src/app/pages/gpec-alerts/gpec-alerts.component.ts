import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GPECAlertsDashboardComponent } from '../../components/gpec-alerts-dashboard/gpec-alerts-dashboard.component';

@Component({
  selector: 'app-gpec-alerts',
  standalone: true,
  imports: [CommonModule, GPECAlertsDashboardComponent],
  template: `
    <app-gpec-alerts-dashboard></app-gpec-alerts-dashboard>
  `,
  styles: []
})
export class GPECAlertsComponent {
  constructor() {}
}