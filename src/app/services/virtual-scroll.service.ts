import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  buffer: number;
  totalItems: number;
}

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
  offsetY: number;
}

@Injectable({
  providedIn: 'root'
})
export class VirtualScrollService {
  private scrollState = new BehaviorSubject<VirtualScrollState>({
    startIndex: 0,
    endIndex: 0,
    visibleItems: [],
    totalHeight: 0,
    offsetY: 0
  });

  public scrollState$ = this.scrollState.asObservable();

  calculateVisibleRange(
    scrollTop: number,
    config: VirtualScrollConfig
  ): { startIndex: number; endIndex: number; offsetY: number } {
    const { itemHeight, containerHeight, buffer, totalItems } = config;
    
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(totalItems, startIndex + visibleCount + buffer * 2);
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, offsetY };
  }

  updateVirtualScroll<T>(
    items: T[],
    scrollTop: number,
    config: VirtualScrollConfig
  ): void {
    const { startIndex, endIndex, offsetY } = this.calculateVisibleRange(scrollTop, config);
    
    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = config.totalItems * config.itemHeight;

    this.scrollState.next({
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY
    });
  }

  optimizeScrollHandler(
    element: HTMLElement,
    callback: (scrollTop: number) => void
  ): () => void {
    let ticking = false;
    let lastScrollTime = 0;

    const handleScroll = () => {
      if (ticking) return;
      
      const now = performance.now();
      if (now - lastScrollTime < 16) return; // Limiter à 60fps
      
      ticking = true;
      lastScrollTime = now;

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          callback(element.scrollTop);
          ticking = false;
        }, { timeout: 50 });
      } else {
        requestAnimationFrame(() => {
          callback(element.scrollTop);
          ticking = false;
        });
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    // Retourner une fonction de nettoyage
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }
}