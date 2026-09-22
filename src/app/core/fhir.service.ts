import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { FhirBundle, Patient, PlanEntrada, construirBundlePlan, recursosDe } from './fhir.models';
import { SYS_PACIENTE, SYS_PLAN, SYS_PRESCRIPCION, SYS_TIPO_LISTA, SYS_UBICACION } from './fhir.systems';
import { FHIR_CONFIG } from './fhir-auth.config';

@Injectable({ providedIn: 'root' })
export class FhirService {
  private http = inject(HttpClient);
  private base = FHIR_CONFIG.baseUrl;

  private buscar(
    tipo: string,
    params: Record<string, string | string[]>,
  ): Observable<FhirBundle> {
    return this.http.get<FhirBundle>(`${this.base}/${tipo}`, { params });
  }

  /** Lista de Salas de Internación. */
  salasDeInternacion(): Observable<FhirBundle> {
    return this.buscar('Group', {
      identifier: `${SYS_UBICACION}|`,
      type: 'person',
      membership: 'enumerated',
    });
  }

  /** Pacientes internados en una sala, identificada por su código de negocio (ej. SALA-32). */
  pacientesEnSala(salaCodigo: string): Observable<FhirBundle> {
    return this.buscar('Group', {
      identifier: `${SYS_UBICACION}|${salaCodigo}`,
      _include: 'Group:member',
    });
  }

  /** Datos básicos de una sala, sin miembros (para tarjetas de contexto). */
  salaPorCodigo(salaCodigo: string): Observable<FhirBundle> {
    return this.buscar('Group', { identifier: `${SYS_UBICACION}|${salaCodigo}` });
  }

  /** Alergias registradas de un paciente (id interno FHIR, ej. pac-482). */
  alergiasDePaciente(pacienteId: string): Observable<FhirBundle> {
    return this.buscar('AllergyIntolerance', { patient: `Patient/${pacienteId}` });
  }

  /** Datos básicos de un paciente, sin includes (para tarjetas de contexto). */
  pacientePorCodigo(pacienteCodigo: string): Observable<FhirBundle> {
    return this.buscar('Patient', { identifier: `${SYS_PACIENTE}|${pacienteCodigo}` });
  }

  /** Planes de medicación vigentes de un paciente, identificado por su código (ej. 482). */
  planesDeMedicacion(pacienteCodigo: string): Observable<FhirBundle> {
    return this.buscar('List', {
      'patient.identifier': `${SYS_PACIENTE}|${pacienteCodigo}`,
      code: `${SYS_TIPO_LISTA}|plan-medicacion-internacion`,
      _include: ['List:item', 'List:subject'],
    });
  }

  /** Planes de medicación de varios pacientes a la vez (para contar por paciente en una sala). */
  planesDeVariosPacientes(pacienteIds: string[]): Observable<FhirBundle> {
    return this.buscar('List', {
      patient: pacienteIds.map(id => `Patient/${id}`).join(','),
      code: `${SYS_TIPO_LISTA}|plan-medicacion-internacion`,
    });
  }

  /** Planes de varios pacientes con sus prescripciones incluidas (para indicadores globales). */
  planesConPrescripcionesDe(pacienteIds: string[]): Observable<FhirBundle> {
    return this.buscar('List', {
      patient: pacienteIds.map(id => `Patient/${id}`).join(','),
      code: `${SYS_TIPO_LISTA}|plan-medicacion-internacion`,
      _include: 'List:item',
    });
  }

  /** Detalle de un plan de medicación puntual (ej. PMG-2026-000123), con sus prescripciones. */
  planDeMedicacion(planCodigo: string): Observable<FhirBundle> {
    return this.buscar('List', {
      identifier: `${SYS_PLAN}|${planCodigo}`,
      _include: 'List:item',
    });
  }

  /** Detalle de un requerimiento/prescripción de medicación (ej. PMG-2026-000123-01). */
  requerimientoDeMedicacion(prescripcionCodigo: string): Observable<FhirBundle> {
    return this.buscar('MedicationRequest', {
      identifier: `${SYS_PRESCRIPCION}|${prescripcionCodigo}`,
      _include: 'MedicationRequest:subject',
    });
  }

  /**
   * Crea un plan de medicación nuevo: resuelve el id interno del paciente y envía
   * una transacción FHIR (List + MedicationRequest) por POST a la raíz del servidor.
   */
  crearPlanDeMedicacion(datos: PlanEntrada): Observable<FhirBundle> {
    return this.buscar('Patient', { identifier: `${SYS_PACIENTE}|${datos.pacienteCodigo}` }).pipe(
      map(bundle => recursosDe<Patient>(bundle, 'Patient')[0]?.id),
      switchMap(pacienteId => {
        if (!pacienteId) {
          return throwError(
            () => new Error(`No se encontró un paciente con código ${datos.pacienteCodigo}.`),
          );
        }
        const bundle = construirBundlePlan(pacienteId, datos);
        return this.http.post<FhirBundle>(`${this.base}/`, bundle, {
          headers: { 'Content-Type': 'application/fhir+json' },
        });
      }),
    );
  }
}
