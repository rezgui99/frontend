import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<Partial<PerformanceMetrics>>({});
  public metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Surveiller les Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeTTFB();
    
    // Optimiser les événements de scroll et resize
    this.optimizeEventListeners();
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        if (lastEntry) {
          const lcp = lastEntry.startTime;
          console.log('📊 LCP:', lcp.toFixed(2), 'ms');
          
          this.updateMetrics({ lcp });
          
          // Alerter si LCP > 2.5s
          if (lcp > 2500) {
            console.warn('⚠️ LCP trop élevé:', lcp.toFixed(2), 'ms (objectif: < 2500ms)');
            this.identifyLCPBottlenecks(lastEntry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          console.log('📊 FID:', fid.toFixed(2), 'ms');
          this.updateMetrics({ fid });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        console.log('📊 CLS:', clsValue.toFixed(4));
        this.updateMetrics({ cls: clsValue });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  private observeTTFB(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === location.href) {
            const ttfb = entry.responseStart - entry.requestStart;
            console.log('📊 TTFB:', ttfb.toFixed(2), 'ms');
            this.updateMetrics({ ttfb });
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private identifyLCPBottlenecks(lcpEntry: any): void {
    console.group('🔍 Analyse des goulots d\'étranglement LCP');
    console.log('Élément LCP:', lcpEntry.element);
    console.log('URL de l\'élément:', lcpEntry.url);
    console.log('Taille de l\'élément:', lcpEntry.size);
    console.log('Temps de rendu:', lcpEntry.renderTime);
    console.log('Temps de chargement:', lcpEntry.loadTime);
    
    // Suggestions d'optimisation
    if (lcpEntry.element?.tagName === 'IMG') {
      console.warn('💡 Suggestion: Optimiser l\'image LCP avec loading="eager" et fetchpriority="high"');
    }
    
    if (lcpEntry.renderTime - lcpEntry.loadTime > 100) {
      console.warn('💡 Suggestion: Le rendu est retardé, vérifier les tâches JavaScript bloquantes');
    }
    
    console.groupEnd();
  }

  private optimizeEventListeners(): void {
    // Optimiser les événements de scroll
    fromEvent(window, 'scroll', { passive: true })
      .pipe(throttleTime(16)) // 60fps max
      .subscribe(() => {
        // Traitement optimisé du scroll
      });

    // Optimiser les événements de resize
    fromEvent(window, 'resize', { passive: true })
      .pipe(debounceTime(100))
      .subscribe(() => {
        // Traitement optimisé du resize
      });
  }

  private updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    const currentMetrics = this.metricsSubject.value;
    this.metricsSubject.next({ ...currentMetrics, ...newMetrics });
  }

  /**
   * Optimise le rendu des listes longues
   */
  optimizeListRendering<T>(
    items: T[],
    containerElement: HTMLElement,
    itemRenderer: (item: T) => HTMLElement,
    itemHeight: number = 50
  ): void {
    const containerHeight = containerElement.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.floor(visibleCount * 0.3); // Réduire le buffer

    let startIndex = 0;
    let endIndex = Math.min(items.length, visibleCount + buffer);
    let isUpdating = false;

    const updateVisibleItems = () => {
      if (isUpdating) return;
      isUpdating = true;
      
      requestAnimationFrame(() => {
        const scrollTop = containerElement.scrollTop;
        const newStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const newEndIndex = Math.min(items.length, newStartIndex + visibleCount + buffer * 2);

        if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
          startIndex = newStartIndex;
          endIndex = newEndIndex;
          this.renderVisibleItems(items.slice(startIndex, endIndex), containerElement, itemRenderer);
        }
        
        isUpdating = false;
      });
    };

 

    // Rendu initial
    updateVisibleItems();
  }

  private renderVisibleItems<T>(
    visibleItems: T[],
    container: HTMLElement,
    renderer: (item: T) => HTMLElement
  ): void {
    // Optimisation: utiliser requestIdleCallback pour le rendu
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.performDOMUpdate(visibleItems, container, renderer);
      }, { timeout: 50 });
    } else {
      setTimeout(() => {
        this.performDOMUpdate(visibleItems, container, renderer);
      }, 0);
    }
  }

  private performDOMUpdate<T>(
    visibleItems: T[],
    container: HTMLElement,
    renderer: (item: T) => HTMLElement
  ): void {
    const fragment = document.createDocumentFragment();
    
    // Traiter par chunks pour éviter les blocages
    const chunkSize = 10;
    let index = 0;
    
    const processChunk = () => {
      const endIndex = Math.min(index + chunkSize, visibleItems.length);
      
      for (let i = index; i < endIndex; i++) {
        const element = renderer(visibleItems[i]);
        fragment.appendChild(element);
      }
      
      index = endIndex;
      
      if (index < visibleItems.length) {
        // Continuer avec le chunk suivant
        requestAnimationFrame(processChunk);
      } else {
        // Terminer le rendu
        container.innerHTML = '';
        container.appendChild(fragment);
      }
    };
    
    processChunk();
  }

  /**
   * Précharge les ressources critiques
   */
  preloadCriticalResources(): void {
    const criticalResources = [
      { href: '/assets/smart-hire-logo.png', as: 'image' },
      { href: '/assets/fonts/inter.woff2', as: 'font', type: 'font/woff2' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      if (resource.as === 'font') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Optimise les animations CSS pour éviter les reflows
   */
  optimizeAnimations(): void {
    const style = document.createElement('style');
    style.textContent = `
      .optimized-animation {
        will-change: transform, opacity;
        transform: translateZ(0); /* Force hardware acceleration */
      }
      
      .fade-in-optimized {
        animation: fadeInOptimized 0.3s ease-out;
      }
      
      @keyframes fadeInOptimized {
        from {
          opacity: 0;
          transform: translate3d(0, 10px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}