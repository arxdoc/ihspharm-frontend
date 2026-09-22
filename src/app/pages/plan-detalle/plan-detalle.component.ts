import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { ContextoCardComponent, ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import {
  AllergyIntolerance,
  FhirList,
  Group,
  MedicationRequest,
  Patient,
  identificador,
  medicamento,
  nombreAlergia,
  nombreCompleto,
  recursosDe,
} from '../../core/fhir.models';

@Component({
  selector: 'app-plan-detalle',
  imports: [FormsModule, RouterLink, ContextoCardComponent],
  templateUrl: './plan-detalle.component.html',
  styleUrl: './plan-detalle.component.css',
})
export class PlanDetalleComponent implements OnInit {
  private service = inject(FhirService);

  readonly salaId = input.required<string>();
  readonly pacienteId = input.required<string>();
  readonly planId = input.required<string>();

  protected readonly sala = signal<Group | undefined>(undefined);
  protected readonly pacienteCtx = signal<Patient | undefined>(undefined);
  protected readonly plan = signal<FhirList | undefined>(undefined);
  protected readonly prescripciones = signal<MedicationRequest[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly identificador = identificador;
  protected readonly medicamento = medicamento;

  private readonly alergias = signal<AllergyIntolerance[] | null>(null);

  protected readonly alertas = computed<ContextoItem[]>(() => {
    const alergias = this.alergias();
    if (!alergias) return [];
    const valor = alergias.length ? alergias.map(nombreAlergia).join(', ') : 'Sin registros';
    return [{ label: 'Alergias', valor }];
  });

  protected readonly busqueda = signal('');

  protected readonly prescripcionesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.prescripciones();
    return this.prescripciones().filter(
      rx =>
        medicamento(rx).toLowerCase().includes(texto) ||
        identificador(rx).toLowerCase().includes(texto),
    );
  });

  protected readonly contexto = computed<ContextoItem[]>(() => {
    const items: ContextoItem[] = [];
    const salaId = this.salaId();
    const pacienteId = this.pacienteId();

    const s = this.sala();
    if (s) {
      items.push({
        label: 'Sala',
        valor: `${identificador(s)} — ${s.name ?? ''}`,
        link: ['/salas', salaId],
      });
    }
    const p = this.pacienteCtx();
    if (p) {
      items.push({
        label: 'Paciente',
        valor: `${nombreCompleto(p.name)} (${identificador(p)})`,
        link: ['/salas', salaId, 'pacientes', pacienteId],
      });
    }
    const plan = this.plan();
    if (plan) {
      items.push({
        label: 'Plan',
        valor: `${identificador(plan)} — ${plan.title ?? ''}`,
      });
    }
    return items;
  });

  ngOnInit() {
    this.service.planDeMedicacion(this.planId()).subscribe({
      next: bundle => {
        this.plan.set(recursosDe<FhirList>(bundle, 'List')[0]);
        this.prescripciones.set(recursosDe<MedicationRequest>(bundle, 'MedicationRequest'));
        this.cargando.set(false);
      },
      error: e => {
        this.error.set('No se pudo consultar el plan de medicación: ' + e.message);
        this.cargando.set(false);
      },
    });

    this.service.salaPorCodigo(this.salaId()).subscribe({
      next: bundle => this.sala.set(recursosDe<Group>(bundle, 'Group')[0]),
      error: () => this.sala.set(undefined),
    });

    this.service.pacientePorCodigo(this.pacienteId()).subscribe({
      next: bundle => {
        const paciente = recursosDe<Patient>(bundle, 'Patient')[0];
        this.pacienteCtx.set(paciente);
        if (!paciente) return;
        this.service.alergiasDePaciente(paciente.id).subscribe({
          next: b => this.alergias.set(recursosDe<AllergyIntolerance>(b, 'AllergyIntolerance')),
          error: () => this.alergias.set(null),
        });
      },
      error: () => this.pacienteCtx.set(undefined),
    });
  }
}
