import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { ContextoCardComponent, ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import { FhirList, Group, Patient, identificador, nombreCompleto, recursosDe } from '../../core/fhir.models';

interface Comunicacion {
  texto: string;
  hora: string;
}

function horaActual(): string {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

@Component({
  selector: 'app-comunicaciones',
  imports: [RouterLink, FormsModule, ContextoCardComponent],
  templateUrl: './comunicaciones.component.html',
  styleUrl: './comunicaciones.component.css',
})
export class ComunicacionesComponent implements OnInit {
  private service = inject(FhirService);

  readonly salaId = input.required<string>();
  readonly pacienteId = input.required<string>();
  readonly planId = input.required<string>();

  protected readonly sala = signal<Group | undefined>(undefined);
  protected readonly paciente = signal<Patient | undefined>(undefined);
  protected readonly plan = signal<FhirList | undefined>(undefined);

  protected readonly mensaje = signal('');
  protected readonly mensajeEditado = signal(false);
  protected readonly comunicaciones = signal<Comunicacion[]>([]);

  protected readonly contexto = computed<ContextoItem[]>(() => {
    const items: ContextoItem[] = [];
    const salaId = this.salaId();
    const pacienteId = this.pacienteId();
    const planId = this.planId();

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
    const plan = this.plan();
    if (plan) {
      items.push({
        label: 'Plan',
        valor: `${identificador(plan)} — ${plan.title ?? ''}`,
        link: ['/salas', salaId, 'pacientes', pacienteId, 'planes', planId],
      });
    }
    return items;
  });

  constructor() {
    // Prellena el mensaje con la plantilla + contexto, y la mantiene al día
    // mientras cargan los datos, hasta que el usuario empiece a editarla.
    effect(() => {
      const items = this.contexto();
      if (this.mensajeEditado()) return;
      const lineas = ['Comunicación oficial - IHS/Pharm', ''];
      for (const item of items) lineas.push(`${item.label}: ${item.valor}`);
      this.mensaje.set(lineas.join('\n'));
    });
  }

  ngOnInit() {
    this.service.salaPorCodigo(this.salaId()).subscribe({
      next: bundle => this.sala.set(recursosDe<Group>(bundle, 'Group')[0]),
      error: () => this.sala.set(undefined),
    });

    this.service.pacientePorCodigo(this.pacienteId()).subscribe({
      next: bundle => this.paciente.set(recursosDe<Patient>(bundle, 'Patient')[0]),
      error: () => this.paciente.set(undefined),
    });

    this.service.planDeMedicacion(this.planId()).subscribe({
      next: bundle => this.plan.set(recursosDe<FhirList>(bundle, 'List')[0]),
      error: () => this.plan.set(undefined),
    });
  }

  protected onMensajeChange(valor: string) {
    this.mensajeEditado.set(true);
    this.mensaje.set(valor);
  }

  protected enviar() {
    const texto = this.mensaje().trim();
    if (!texto) return;
    this.comunicaciones.update(actuales => [...actuales, { texto, hora: horaActual() }]);
    this.mensaje.set('');
    this.mensajeEditado.set(true);
  }
}
