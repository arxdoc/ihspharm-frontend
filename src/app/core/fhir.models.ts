import {
  SYS_CATEGORIA_ADMIN,
  SYS_MEDICAMENTO,
  SYS_PLAN,
  SYS_PRESCRIPCION,
  SYS_TIPO_LISTA,
  SYS_UCUM,
} from './fhir.systems';

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
}

export interface FhirBundleEntry<T = FhirResource> {
  resource?: T;
  search?: { mode?: string };
}

export interface FhirBundle<T = FhirResource> {
  resourceType: 'Bundle';
  total?: number;
  entry?: FhirBundleEntry<T>[];
}

export interface HumanName {
  text?: string;
  family?: string;
  given?: string[];
}

export interface CodeableConcept {
  text?: string;
  coding?: { system?: string; code?: string; display?: string }[];
}

export interface GroupMember {
  entity: FhirReference;
  inactive?: boolean;
}

export interface Group {
  resourceType: 'Group';
  id: string;
  identifier?: FhirIdentifier[];
  name?: string;
  quantity?: number;
  member?: GroupMember[];
}

export interface Patient {
  resourceType: 'Patient';
  id: string;
  identifier?: FhirIdentifier[];
  name?: HumanName[];
  birthDate?: string;
}

export interface ListEntry {
  item: FhirReference;
}

export interface FhirList {
  resourceType: 'List';
  id: string;
  identifier?: FhirIdentifier[];
  status?: string;
  title?: string;
  date?: string;
  subject?: FhirReference[];
  entry?: ListEntry[];
}

export interface Dosage {
  text?: string;
}

export interface MedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  identifier?: FhirIdentifier[];
  groupIdentifier?: FhirIdentifier;
  status?: string;
  intent?: string;
  authoredOn?: string;
  medication?: { concept?: CodeableConcept };
  subject?: FhirReference;
  requester?: FhirReference;
  dosageInstruction?: Dosage[];
}

export interface Practitioner {
  resourceType: 'Practitioner';
  id: string;
  name?: HumanName[];
}

export interface AllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  code?: CodeableConcept;
}

export type FhirResource =
  | Group
  | Patient
  | FhirList
  | MedicationRequest
  | Practitioner
  | AllergyIntolerance;

export function nombreCompleto(name?: HumanName[]): string {
  const n = name?.[0];
  if (!n) return '(sin nombre)';
  if (n.text) return n.text;
  return [...(n.given ?? []), n.family].filter(Boolean).join(' ');
}

export function idDeReferencia(ref?: FhirReference): string | undefined {
  return ref?.reference?.split('/').pop();
}

export function identificador(resource?: { identifier?: FhirIdentifier[] }): string {
  return resource?.identifier?.[0]?.value ?? '';
}

export function medicamento(mr?: MedicationRequest): string {
  const mc = mr?.medication?.concept;
  return mc?.text ?? mc?.coding?.[0]?.display ?? '-';
}

/** Filtra la lista de pacientes incluidos, descartando los que ya tienen alta en la sala. */
export function pacientesInternadosDe(sala: Group | undefined, pacientes: Patient[]): Patient[] {
  const idsDeAlta = new Set(
    (sala?.member ?? [])
      .filter(m => m.inactive)
      .map(m => idDeReferencia(m.entity)),
  );
  return pacientes.filter(p => !idsDeAlta.has(p.id));
}

/** Nombre legible de una alergia registrada. */
export function nombreAlergia(a: AllergyIntolerance): string {
  return a.code?.text ?? a.code?.coding?.[0]?.display ?? '-';
}

/** Cantidad de prescripciones activas (status: active) que tiene un plan de medicación. */
export function cantidadPrescripcionesActivas(
  plan: FhirList | undefined,
  prescripciones: MedicationRequest[],
): number {
  const idsActivas = new Set(
    prescripciones.filter(mr => mr.status === 'active').map(mr => mr.id),
  );
  return (plan?.entry ?? []).filter(e => {
    const id = idDeReferencia(e.item);
    return !!id && idsActivas.has(id);
  }).length;
}

/** Cuenta los planes de medicación (List) de un bundle, agrupados por id interno de paciente. */
export function contarPlanesPorPaciente(bundle: FhirBundle | undefined): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const lista of recursosDe<FhirList>(bundle, 'List')) {
    const pacienteId = idDeReferencia(lista.subject?.[0]);
    if (!pacienteId) continue;
    conteo[pacienteId] = (conteo[pacienteId] ?? 0) + 1;
  }
  return conteo;
}

export function recursosDe<T extends FhirResource>(
  bundle: FhirBundle | undefined,
  resourceType: T['resourceType'],
): T[] {
  return (bundle?.entry ?? [])
    .map(e => e.resource)
    .filter((r): r is T => !!r && r.resourceType === resourceType);
}

/* ---------- Alta de plan de medicación ---------- */

export interface PrescripcionEntrada {
  codigoMedicamento: string;
  nombreMedicamento: string;
  dosisValor: number;
  dosisUnidad: string;
  horas: number;
  dias: number;
}

export interface PlanEntrada {
  codigoPlan: string;
  titulo: string;
  pacienteCodigo: string;
  profesionalId: string;
  fecha: string; // ISO 8601
  prescripciones: PrescripcionEntrada[];
}

function idCorto(prefijo: string): string {
  return `${prefijo}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Arma la transacción FHIR (List + MedicationRequest) para dar de alta un plan de medicación. */
export function construirBundlePlan(pacienteId: string, datos: PlanEntrada) {
  const codigoPlan = datos.codigoPlan.trim();
  const idPlan = idCorto('plan');
  const idsRx = datos.prescripciones.map(() => idCorto('mr'));

  const entradasRx = datos.prescripciones.map((rx, i) => {
    const dias = rx.dias;
    const frecuenciaPorDia = Math.round(24 / rx.horas);
    const texto = `${rx.dosisValor} ${rx.dosisUnidad} cada ${rx.horas} horas por ${dias} día${dias === 1 ? '' : 's'}`;
    const codigoRx = `${codigoPlan}-${String(i + 1).padStart(2, '0')}`;

    return {
      fullUrl: `MedicationRequest/${idsRx[i]}`,
      resource: {
        resourceType: 'MedicationRequest',
        id: idsRx[i],
        identifier: [{ system: SYS_PRESCRIPCION, value: codigoRx }],
        groupIdentifier: { system: SYS_PLAN, value: codigoPlan },
        status: 'active',
        intent: 'order',
        category: [
          {
            coding: [{ system: SYS_CATEGORIA_ADMIN, code: 'inpatient', display: 'Inpatient' }],
          },
        ],
        medication: {
          concept: {
            coding: [
              {
                system: SYS_MEDICAMENTO,
                code: rx.codigoMedicamento.trim(),
                display: rx.nombreMedicamento.trim(),
              },
            ],
          },
        },
        subject: { reference: `Patient/${pacienteId}` },
        authoredOn: datos.fecha,
        requester: { reference: `Practitioner/${datos.profesionalId.trim()}` },
        dosageInstruction: [
          {
            text: texto,
            timing: {
              repeat: {
                boundsDuration: { value: dias, unit: 'd', system: SYS_UCUM, code: 'd' },
                frequency: frecuenciaPorDia,
                period: 1,
                periodUnit: 'd',
              },
            },
            doseAndRate: [
              {
                doseQuantity: {
                  value: rx.dosisValor,
                  unit: rx.dosisUnidad.trim(),
                  system: SYS_UCUM,
                  code: rx.dosisUnidad.trim(),
                },
              },
            ],
          },
        ],
      },
      request: { method: 'PUT', url: `MedicationRequest/${idsRx[i]}` },
    };
  });

  const entradaPlan = {
    fullUrl: `List/${idPlan}`,
    resource: {
      resourceType: 'List',
      id: idPlan,
      identifier: [{ system: SYS_PLAN, value: codigoPlan }],
      status: 'current',
      mode: 'working',
      title: datos.titulo.trim(),
      code: {
        coding: [
          {
            system: SYS_TIPO_LISTA,
            code: 'plan-medicacion-internacion',
            display: 'Plan de medicación de internación',
          },
        ],
      },
      subject: [{ reference: `Patient/${pacienteId}` }],
      date: datos.fecha,
      source: { reference: `Practitioner/${datos.profesionalId.trim()}` },
      entry: idsRx.map(id => ({ item: { reference: `MedicationRequest/${id}` } })),
    },
    request: { method: 'PUT', url: `List/${idPlan}` },
  };

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [...entradasRx, entradaPlan],
  };
}
