import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './login-selector.component.html',
  styleUrls: ['./login-selector.component.css']
})
export class LoginSelectorComponent {
  constructor() {}
}