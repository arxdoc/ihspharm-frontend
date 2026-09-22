import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { FHIR_CONFIG } from './fhir-auth.config';
import { FhirAuthService } from './fhir-auth.service';

/** Agrega el Bearer token solo a los requests que van al servidor FHIR. */
export const fhirAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(FHIR_CONFIG.baseUrl)) {
    return next(req);
  }

  const auth = inject(FhirAuthService);
  return auth
    .obtenerToken()
    .pipe(switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))));
};
