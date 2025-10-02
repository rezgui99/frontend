import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, timeout, retry } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  private requestTimes = new Map<string, number>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = performance.now();
    const requestId = `${req.method}_${req.url}_${startTime}`;
    
    // Optimiser les requêtes avec timeout plus court
    const optimizedReq = req.clone({
      setHeaders: {
        'Cache-Control': 'max-age=300', // Cache de 5 minutes
        'X-Request-ID': requestId
      }
    });

    return next.handle(optimizedReq).pipe(
      timeout(5000), // Timeout de 5 secondes pour éviter les blocages
      retry(1), // Une seule tentative de retry
      tap({
        next: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Logger les requêtes lentes
          if (duration > 1000) {
            console.warn(`🐌 Requête lente détectée: ${req.url} - ${duration.toFixed(2)}ms`);
          }
          
          // Nettoyer le cache des temps de requête
          this.requestTimes.delete(requestId);
        },
        error: (error) => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.error(`❌ Erreur requête: ${req.url} - ${duration.toFixed(2)}ms`, error);
          this.requestTimes.delete(requestId);
        }
      })
    );
  }
}