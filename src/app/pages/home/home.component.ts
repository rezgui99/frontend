import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GPECAlertWidgetComponent } from '../../components/gpec-alert-widget/gpec-alert-widget.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, GPECAlertWidgetComponent ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent { }