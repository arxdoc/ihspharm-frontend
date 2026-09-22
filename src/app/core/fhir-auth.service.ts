import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { FHIR_CONFIG } from './fhir-auth.config';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class FhirAuthService {
  private http = inject(HttpClient);
  private token$: Observable<string> | null = null;
  private expiraEn = 0;

  /** Token cacheado hasta ~1 minuto antes de expirar; se renueva solo. */
  obtenerToken(): Observable<string> {
    if (this.token$ && Date.now() < this.expiraEn) {
      return this.token$;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: FHIR_CONFIG.clientId,
      client_secret: FHIR_CONFIG.clientSecret,
    }).toString();

    this.token$ = this.http
      .post<TokenResponse>(FHIR_CONFIG.tokenUrl, body, {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
      .pipe(
        tap(res => {
          this.expiraEn = Date.now() + (res.expires_in - 60) * 1000;
        }),
        map(res => res.access_token),
        shareReplay(1),
      );

    return this.token$;
  }
}
