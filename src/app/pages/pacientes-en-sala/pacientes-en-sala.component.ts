import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { ContextoCardComponent, ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import { IndicadoresCardComponent } from '../../shared/indicadores-card/indicadores-card.component';
import {
  Group,
  Patient,
  contarPlanesPorPaciente,
  identificador,
  nombreCompleto,
  pacientesInternadosDe,
  recursosDe,
} from '../../core/fhir.models';

@Component({
  selector: 'app-pacientes-en-sala',
  imports: [FormsModule, RouterLink, ContextoCardComponent, IndicadoresCardComponent],
  templateUrl: './pacientes-en-sala.component.html',
  styleUrl: './pacientes-en-sala.component.css',
})
export class PacientesEnSalaComponent implements OnInit {
  private service = inject(FhirService);

  readonly salaId = input.required<string>();

  protected readonly sala = signal<Group | undefined>(undefined);
  protected readonly pacientes = signal<Patient[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly nombreCompleto = nombreCompleto;
  protected readonly identificador = identificador;
  protected readonly conteoPlanes = signal<Record<string, number>>({});
  private readonly planesCargados = signal(false);

  protected readonly busqueda = signal('');

  protected readonly pacientesFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.pacientes();
    return this.pacientes().filter(
      p =>
        nombreCompleto(p.name).toLowerCase().includes(texto) ||
        identificador(p).toLowerCase().includes(texto),
    );
  });

  protected readonly contexto = computed<ContextoItem[]>(() => {
    const s = this.sala();
    return s ? [{ label: 'Sala', valor: `${identificador(s)} — ${s.name ?? ''}` }] : [];
  });

  protected readonly indicadores = computed<ContextoItem[]>(() => {
    const pacientes = this.pacientes();
    const altas = (this.sala()?.member ?? []).filter(m => m.inactive).length;
    const items: ContextoItem[] = [
      { label: 'Pacientes internados', valor: String(pacientes.length) },
      { label: 'Altas', valor: String(altas) },
    ];
    if (this.planesCargados()) {
      const conteo = this.conteoPlanes();
      const totalPlanes = pacientes.reduce((acc, p) => acc + (conteo[p.id] ?? 0), 0);
      const sinPlan = pacientes.filter(p => !conteo[p.id]).length;
      items.push({ label: 'Planes de medicación', valor: String(totalPlanes) });
      items.push({ label: 'Pacientes sin plan', valor: String(sinPlan) });
    }
    return items;
  });

  ngOnInit() {
    this.service.pacientesEnSala(this.salaId()).subscribe({
      next: bundle => {
        const sala = recursosDe<Group>(bundle, 'Group')[0];
        const pacientes = pacientesInternadosDe(sala, recursosDe<Patient>(bundle, 'Patient'));
        this.sala.set(sala);
        this.pacientes.set(pacientes);
        this.cargando.set(false);

        if (pacientes.length) {
          this.service.planesDeVariosPacientes(pacientes.map(p => p.id)).subscribe({
            next: planesBundle => {
              this.conteoPlanes.set(contarPlanesPorPaciente(planesBundle));
              this.planesCargados.set(true);
            },
            error: () => this.conteoPlanes.set({}),
          });
        } else {
          this.planesCargados.set(true);
        }
      },
      error: e => {
        this.error.set('No se pudieron consultar los pacientes: ' + e.message);
        this.cargando.set(false);
      },
    });
  }
}
