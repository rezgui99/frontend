import { 
  Directive, 
  ElementRef, 
  Input, 
  OnInit, 
  OnDestroy, 
  TemplateRef, 
  ViewContainerRef,
  ChangeDetectorRef
} from '@angular/core';
import { VirtualScrollService, VirtualScrollConfig } from '../services/virtual-scroll.service';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[appVirtualScroll]',
  standalone: true
})
export class VirtualScrollDirective implements OnInit, OnDestroy {
  @Input() items: any[] = [];
  @Input() itemHeight: number = 50;
  @Input() buffer: number = 5;

  private destroy$ = new Subject<void>();
  private cleanupScroll?: () => void;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private virtualScrollService: VirtualScrollService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupVirtualScroll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupScroll?.();
  }

  private setupVirtualScroll(): void {
    const element = this.elementRef.nativeElement;
    const containerHeight = element.clientHeight || 400;

    const config: VirtualScrollConfig = {
      itemHeight: this.itemHeight,
      containerHeight,
      buffer: this.buffer,
      totalItems: this.items.length
    };

    // Configurer le conteneur
    element.style.height = `${containerHeight}px`;
    element.style.overflow = 'auto';
    element.style.position = 'relative';

    // Écouter les changements de scroll
    this.cleanupScroll = this.virtualScrollService.optimizeScrollHandler(
      element,
      (scrollTop) => {
        this.virtualScrollService.updateVirtualScroll(this.items, scrollTop, config);
      }
    );

    // S'abonner aux changements d'état
    this.virtualScrollService.scrollState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.renderVisibleItems(state);
      });

    // Rendu initial
    this.virtualScrollService.updateVirtualScroll(this.items, 0, config);
  }

  private renderVisibleItems(state: any): void {
    // Nettoyer les vues existantes
    this.viewContainer.clear();

    // Créer un conteneur avec la hauteur totale
    const wrapper = document.createElement('div');
    wrapper.style.height = `${state.totalHeight}px`;
    wrapper.style.position = 'relative';

    // Créer un conteneur pour les éléments visibles
    const visibleContainer = document.createElement('div');
    visibleContainer.style.transform = `translateY(${state.offsetY}px)`;
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.width = '100%';

    // Rendre les éléments visibles
    state.visibleItems.forEach((item: any, index: number) => {
      const embeddedView = this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: item,
        index: state.startIndex + index
      });
      
      embeddedView.rootNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          visibleContainer.appendChild(node);
        }
      });
    });

    wrapper.appendChild(visibleContainer);
    this.elementRef.nativeElement.appendChild(wrapper);
    
    this.cdr.markForCheck();
  }
}