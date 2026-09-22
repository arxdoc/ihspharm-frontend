import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { ContextoCardComponent, ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import {
  Group,
  MedicationRequest,
  Patient,
  identificador,
  medicamento,
  nombreCompleto,
  recursosDe,
} from '../../core/fhir.models';

@Component({
  selector: 'app-requerimiento-detalle',
  imports: [RouterLink, ContextoCardComponent],
  templateUrl: './requerimiento-detalle.component.html',
  styleUrl: './requerimiento-detalle.component.css',
})
export class RequerimientoDetalleComponent implements OnInit {
  private service = inject(FhirService);

  readonly salaId = input.required<string>();
  readonly pacienteId = input.required<string>();
  readonly prescripcionId = input.required<string>();

  protected readonly sala = signal<Group | undefined>(undefined);
  protected readonly requerimiento = signal<MedicationRequest | undefined>(undefined);
  protected readonly paciente = signal<Patient | undefined>(undefined);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

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
    const p = this.paciente();
    if (p) {
      items.push({
        label: 'Paciente',
        valor: `${nombreCompleto(p.name)} (${identificador(p)})`,
        link: ['/salas', salaId, 'pacientes', pacienteId],
      });
    }
    const rx = this.requerimiento();
    const codigoPlan = rx?.groupIdentifier?.value;
    if (codigoPlan) {
      items.push({
        label: 'Plan',
        valor: codigoPlan,
        link: ['/salas', salaId, 'pacientes', pacienteId, 'planes', codigoPlan],
      });
    }
    if (rx) {
      items.push({ label: 'Medicamento', valor: medicamento(rx) });
      items.push({ label: 'Dosificación', valor: rx.dosageInstruction?.[0]?.text ?? '-' });
    }
    return items;
  });

  protected readonly volverLink = computed(() => {
    const codigoPlan = this.requerimiento()?.groupIdentifier?.value;
    return codigoPlan
      ? ['/salas', this.salaId(), 'pacientes', this.pacienteId(), 'planes', codigoPlan]
      : ['/salas', this.salaId(), 'pacientes', this.pacienteId()];
  });

  ngOnInit() {
    this.service.requerimientoDeMedicacion(this.prescripcionId()).subscribe({
      next: bundle => {
        this.requerimiento.set(
          recursosDe<MedicationRequest>(bundle, 'MedicationRequest')[0],
        );
        this.paciente.set(recursosDe<Patient>(bundle, 'Patient')[0]);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set('No se pudo consultar el requerimiento de medicación: ' + e.message);
        this.cargando.set(false);
      },
    });

    this.service.salaPorCodigo(this.salaId()).subscribe({
      next: bundle => this.sala.set(recursosDe<Group>(bundle, 'Group')[0]),
      error: () => this.sala.set(undefined),
    });
  }
}
