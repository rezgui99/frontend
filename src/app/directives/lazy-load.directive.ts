import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private elementRef: ElementRef<HTMLImageElement>) {}

  ngOnInit(): void {
    this.setupLazyLoading();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupLazyLoading(): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
      this.loadImage();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        // Optimisation: traiter seulement la première entrée visible
        const visibleEntry = entries.find(entry => entry.isIntersecting);
        if (visibleEntry) {
          this.loadImage();
          this.observer?.unobserve(visibleEntry.target);
        }
      },
      {
        rootMargin: '100px 0px', // Augmenter la marge pour un préchargement plus précoce
        threshold: 0.01 // Réduire le seuil pour déclencher plus tôt
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  private loadImage(): void {
    const img = this.elementRef.nativeElement;
    const dataSrc = img.getAttribute('data-src');
    
    if (dataSrc) {
      // Optimisations pour le chargement d'image
      img.loading = 'lazy';
      img.decoding = 'async';
      
      // Charger l'image de manière optimisée
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          this.performImageLoad(img, dataSrc);
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          this.performImageLoad(img, dataSrc);
        }, 0);
      }
    }
  }

  private performImageLoad(img: HTMLImageElement, dataSrc: string): void {
    const tempImg = new Image();
    tempImg.onload = () => {
      requestAnimationFrame(() => {
        img.src = dataSrc;
        img.classList.add('loaded');
      });
    };
    tempImg.onerror = () => {
      requestAnimationFrame(() => {
        img.classList.add('error');
      });
    };
    tempImg.src = dataSrc;
  }
}