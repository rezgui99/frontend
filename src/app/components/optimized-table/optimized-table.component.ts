import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy, 
  TrackByFunction,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualScrollDirective } from '../../directives/virtual-scroll.directive';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

@Component({
  selector: 'app-optimized-table',
  standalone: true,
  imports: [CommonModule, VirtualScrollDirective],
  template: `
    <div class="overflow-hidden rounded-lg shadow">
      <!-- Header -->
      <div class="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div class="grid gap-4" [style.grid-template-columns]="gridTemplate">
          <div *ngFor="let column of columns; trackBy: trackByColumn" 
               class="text-xs font-medium text-gray-500 uppercase tracking-wider"
               [class.cursor-pointer]="column.sortable"
               (click)="column.sortable && onSort(column.key)">
            {{ column.label }}
            <span *ngIf="column.sortable && sortColumn === column.key" 
                  class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Body with virtual scrolling -->
      <div class="bg-white max-h-96 overflow-auto" 
           appVirtualScroll 
           [items]="sortedData" 
           [itemHeight]="itemHeight">
        <ng-template let-item let-index="index">
          <div class="px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
               [style.height.px]="itemHeight">
            <div class="grid gap-4 items-center" [style.grid-template-columns]="gridTemplate">
              <div *ngFor="let column of columns; trackBy: trackByColumn" 
                   class="text-sm text-gray-900 truncate">
                <ng-container [ngSwitch]="column.key">
                  <span *ngSwitchDefault>{{ getNestedValue(item, column.key) }}</span>
                </ng-container>
              </div>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Footer -->
      <div *ngIf="showPagination" class="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Affichage de {{ startIndex }} à {{ endIndex }} sur {{ totalItems }} éléments
          </div>
          <div class="flex space-x-2">
            <button (click)="onPageChange(currentPage - 1)"
                    [disabled]="currentPage === 1"
                    class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">
              Précédent
            </button>
            <button (click)="onPageChange(currentPage + 1)"
                    [disabled]="currentPage === totalPages"
                    class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedTableComponent implements OnInit, OnDestroy {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() itemHeight: number = 60;
  @Input() showPagination: boolean = true;
  @Input() pageSize: number = 20;

  @Output() sortChange = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();
  @Output() pageChange = new EventEmitter<number>();

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  
  sortedData: any[] = [];
  gridTemplate: string = '';

  trackByColumn: TrackByFunction<TableColumn> = (index, column) => column.key;
  trackByItem: TrackByFunction<any> = (index, item) => item.id || index;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updateGridTemplate();
    this.updateSortedData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private updateGridTemplate(): void {
    this.gridTemplate = this.columns
      .map(col => col.width || '1fr')
      .join(' ');
  }

  private updateSortedData(): void {
    // Optimiser le tri avec requestIdleCallback
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.performSort();
      }, { timeout: 100 });
    } else {
      setTimeout(() => {
        this.performSort();
      }, 0);
    }
  }

  private performSort(): void {
    let result = [...this.data];

    if (this.sortColumn) {
      result.sort((a, b) => {
        const aVal = this.getNestedValue(a, this.sortColumn);
        const bVal = this.getNestedValue(b, this.sortColumn);
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return this.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    // Pagination
    if (this.showPagination) {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      result = result.slice(startIndex, endIndex);
    }

    this.sortedData = result;
    this.cdr.markForCheck();
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.updateSortedData();
    this.sortChange.emit({ column, direction: this.sortDirection });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateSortedData();
    this.pageChange.emit(page);
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  }

  get totalItems(): number {
    return this.data.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }
}