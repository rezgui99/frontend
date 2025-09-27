import { Injectable } from '@angular/core';
import { fromEvent, merge, Subject } from 'rxjs';
import { debounceTime, throttleTime, takeUntil } from 'rxjs/operators';

interface InteractionMetrics {
  type: string;
  target: string;
  duration: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class InteractionOptimizerService {
  private interactions: InteractionMetrics[] = [];
  private destroy$ = new Subject<void>();
  private slowInteractionThreshold = 200; // 200ms threshold for INP

  constructor() {
    this.setupInteractionMonitoring();
  }

  private setupInteractionMonitoring(): void {
    // Surveiller les clics
    fromEvent(document, 'click', { passive: true })
      .pipe(
        throttleTime(50), // Éviter les clics multiples rapides
        takeUntil(this.destroy$)
      )
      .subscribe((event: Event) => {
        this.measureInteraction('click', event);
      });

    // Surveiller les saisies clavier
    fromEvent(document, 'keydown', { passive: true })
      .pipe(
        debounceTime(100), // Debounce pour les saisies rapides
        takeUntil(this.destroy$)
      )
      .subscribe((event: Event) => {
        this.measureInteraction('keydown', event);
      });

    // Surveiller les changements de formulaire
    fromEvent(document, 'input', { passive: true })
      .pipe(
        debounceTime(150),
        takeUntil(this.destroy$)
      )
      .subscribe((event: Event) => {
        this.measureInteraction('input', event);
      });
  }

  private measureInteraction(type: string, event: Event): void {
    const startTime = performance.now();
    const target = this.getTargetSelector(event.target as Element);

    // Mesurer le temps de réponse
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const interaction: InteractionMetrics = {
        type,
        target,
        duration,
        timestamp: startTime
      };

      this.interactions.push(interaction);

      // Alerter pour les interactions lentes
      if (duration > this.slowInteractionThreshold) {
        console.warn(`🐌 Interaction lente détectée:`, interaction);
        this.suggestOptimizations(interaction);
      }

      // Limiter l'historique
      if (this.interactions.length > 100) {
        this.interactions = this.interactions.slice(-50);
      }
    });
  }

  private getTargetSelector(element: Element): string {
    if (!element) return 'unknown';
    
    // Construire un sélecteur simple
    let selector = element.tagName.toLowerCase();
    
    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.className) {
      const classes = element.className.toString().split(' ').slice(0, 2);
      selector += `.${classes.join('.')}`;
    }
    
    return selector;
  }

  private suggestOptimizations(interaction: InteractionMetrics): void {
    console.group(`💡 Suggestions d'optimisation pour ${interaction.target}`);
    
    switch (interaction.type) {
      case 'click':
        console.log('- Utiliser ChangeDetectionStrategy.OnPush');
        console.log('- Ajouter trackBy functions pour *ngFor');
        console.log('- Différer les calculs lourds avec requestIdleCallback');
        break;
        
      case 'input':
        console.log('- Ajouter debounceTime pour les recherches');
        console.log('- Utiliser reactive forms avec debounce');
        console.log('- Optimiser les validations de formulaire');
        break;
        
      case 'keydown':
        console.log('- Optimiser les raccourcis clavier');
        console.log('- Éviter les calculs synchrones dans les handlers');
        break;
    }
    
    console.groupEnd();
  }

  /**
   * Optimise automatiquement les interactions pour un composant
   */
  optimizeComponent(componentElement: HTMLElement): () => void {
    const cleanupFunctions: (() => void)[] = [];

    // Optimiser les boutons
    const buttons = componentElement.querySelectorAll('button, .btn');
    buttons.forEach(button => {
      const cleanup = this.optimizeButton(button as HTMLElement);
      cleanupFunctions.push(cleanup);
    });

    // Optimiser les inputs
    const inputs = componentElement.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const cleanup = this.optimizeInput(input as HTMLElement);
      cleanupFunctions.push(cleanup);
    });

    // Retourner une fonction de nettoyage
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }

  private optimizeButton(button: HTMLElement): () => void {
    let isProcessing = false;

    const optimizedClickHandler = (event: Event) => {
      if (isProcessing) {
        event.preventDefault();
        return;
      }

      isProcessing = true;
      
      // Ajouter un indicateur visuel
      button.style.opacity = '0.7';
      button.style.pointerEvents = 'none';

      // Restaurer après un délai
      setTimeout(() => {
        button.style.opacity = '';
        button.style.pointerEvents = '';
        isProcessing = false;
      }, 300);
    };

    button.addEventListener('click', optimizedClickHandler, { passive: false });

    return () => {
      button.removeEventListener('click', optimizedClickHandler);
    };
  }

  private optimizeInput(input: HTMLElement): () => void {
    let debounceTimeout: any;

    const optimizedInputHandler = (event: Event) => {
      clearTimeout(debounceTimeout);
      
      debounceTimeout = setTimeout(() => {
        // Traitement différé de l'input
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            // Traitement de l'input
          }, { timeout: 100 });
        }
      }, 150);
    };

    input.addEventListener('input', optimizedInputHandler, { passive: true });

    return () => {
      input.removeEventListener('input', optimizedInputHandler);
      clearTimeout(debounceTimeout);
    };
  }

  /**
   * Obtenir les métriques d'interaction
   */
  getInteractionMetrics(): InteractionMetrics[] {
    return [...this.interactions];
  }

  /**
   * Obtenir les interactions lentes
   */
  getSlowInteractions(): InteractionMetrics[] {
    return this.interactions.filter(i => i.duration > this.slowInteractionThreshold);
  }

  /**
   * Nettoyer le service
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}