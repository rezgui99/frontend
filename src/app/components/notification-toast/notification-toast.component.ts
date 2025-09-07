import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css']
})
export class NotificationToastComponent implements OnInit {
  @Input() notification!: Notification;
  @Output() onClose = new EventEmitter<void>();
  @Output() onAction = new EventEmitter<string>();

  visible: boolean = false;

  ngOnInit(): void {
    // Animation d'entrée
    setTimeout(() => {
      this.visible = true;
    }, 100);

    // Auto-fermeture après 5 secondes
    setTimeout(() => {
      this.close();
    }, 5000);
  }

  close(): void {
    this.visible = false;
    setTimeout(() => {
      this.onClose.emit();
    }, 300);
  }

  executeAction(actionType: string): void {
    this.onAction.emit(actionType);
    this.close();
  }

  getToastClass(): string {
    const baseClass = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-sm';
    const typeClasses = {
      success: 'bg-green-100 border border-green-400 text-green-700',
      info: 'bg-blue-100 border border-blue-400 text-blue-700',
      warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
      error: 'bg-red-100 border border-red-400 text-red-700'
    };
    
    const visibilityClass = this.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';
    
    return `${baseClass} ${typeClasses[this.notification.type]} ${visibilityClass}`;
  }

  getIcon(): string {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    return icons[this.notification.type] || 'ℹ️';
  }

  getActionButtonClass(style: string): string {
    const classes = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      danger: 'bg-red-500 hover:bg-red-600 text-white'
    };
    return classes[style as keyof typeof classes] || classes.primary;
  }
}