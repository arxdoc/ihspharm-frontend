import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { ContextoCardComponent, ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import { IndicadoresCardComponent } from '../../shared/indicadores-card/indicadores-card.component';
import {
  FhirList,
  Group,
  MedicationRequest,
  Patient,
  cantidadPrescripcionesActivas,
  identificador,
  nombreCompleto,
  recursosDe,
} from '../../core/fhir.models';

@Component({
  selector: 'app-planes-de-medicacion',
  imports: [FormsModule, RouterLink, ContextoCardComponent, IndicadoresCardComponent],
  templateUrl: './planes-de-medicacion.component.html',
  styleUrl: './planes-de-medicacion.component.css',
})
export class PlanesDeMedicacionComponent implements OnInit {
  private service = inject(FhirService);

  readonly salaId = input.required<string>();
  readonly pacienteId = input.required<string>();

  protected readonly sala = signal<Group | undefined>(undefined);
  protected readonly paciente = signal<Patient | undefined>(undefined);
  protected readonly planes = signal<FhirList[]>([]);
  protected readonly prescripciones = signal<MedicationRequest[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly identificador = identificador;

  protected cantidadActivas(plan: FhirList): number {
    return cantidadPrescripcionesActivas(plan, this.prescripciones());
  }

  protected readonly busqueda = signal('');

  protected readonly planesFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.planes();
    return this.planes().filter(
      plan =>
        (plan.title ?? '').toLowerCase().includes(texto) ||
        identificador(plan).toLowerCase().includes(texto),
    );
  });

  protected readonly contexto = computed<ContextoItem[]>(() => {
    const items: ContextoItem[] = [];
    const salaId = this.salaId();

    const s = this.sala();
    if (s) {
      items.push({
        label: 'Sala',
        valor: `${identificador(s)} — ${s.name ?? ''}`,
        link: ['/salas', salaId],
      });
    }
    const p = this.paciente();
    if (p) {
      items.push({
        label: 'Paciente',
        valor: `${nombreCompleto(p.name)} (${identificador(p)})`,
      });
    }
    return items;
  });

  protected readonly indicadores = computed<ContextoItem[]>(() => [
    { label: 'Planes', valor: String(this.planes().length) },
    {
      label: 'Prescripciones',
      valor: String(this.prescripciones().filter(mr => mr.status === 'active').length),
    },
  ]);

  ngOnInit() {
    this.service.planesDeMedicacion(this.pacienteId()).subscribe({
      next: bundle => {
        this.paciente.set(recursosDe<Patient>(bundle, 'Patient')[0]);
        this.planes.set(recursosDe<FhirList>(bundle, 'List'));
        this.prescripciones.set(recursosDe<MedicationRequest>(bundle, 'MedicationRequest'));
        this.cargando.set(false);
      },
      error: e => {
        this.error.set('No se pudieron consultar los planes de medicación: ' + e.message);
        this.cargando.set(false);
      },
    });

    this.service.salaPorCodigo(this.salaId()).subscribe({
      next: bundle => this.sala.set(recursosDe<Group>(bundle, 'Group')[0]),
      error: () => this.sala.set(undefined),
    });
  }
}
