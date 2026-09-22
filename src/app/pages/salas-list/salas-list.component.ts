import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { IndicadoresCardComponent } from '../../shared/indicadores-card/indicadores-card.component';
import { ContextoItem } from '../../shared/contexto-card/contexto-card.component';
import {
  FhirList,
  Group,
  MedicationRequest,
  idDeReferencia,
  identificador,
  recursosDe,
} from '../../core/fhir.models';

@Component({
  selector: 'app-salas-list',
  imports: [FormsModule, RouterLink, IndicadoresCardComponent],
  templateUrl: './salas-list.component.html',
  styleUrl: './salas-list.component.css',
})
export class SalasListComponent implements OnInit {
  private service = inject(FhirService);

  protected readonly salas = signal<Group[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly identificador = identificador;

  private readonly planesYPrescripciones = signal<{ planes: number; prescripciones: number } | null>(null);

  protected readonly busqueda = signal('');

  protected readonly indicadores = computed<ContextoItem[]>(() => {
    const salas = this.salas();
    const items: ContextoItem[] = [
      { label: 'Salas', valor: String(salas.length) },
      { label: 'Pacientes', valor: String(this.idsPacientesInternados(salas).length) },
    ];
    const extra = this.planesYPrescripciones();
    if (extra) {
      items.push({ label: 'Planes', valor: String(extra.planes) });
      items.push({ label: 'Prescripciones', valor: String(extra.prescripciones) });
    }
    return items;
  });

  protected readonly salasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.salas();
    return this.salas().filter(
      sala =>
        (sala.name ?? '').toLowerCase().includes(texto) ||
        identificador(sala).toLowerCase().includes(texto),
    );
  });

  ngOnInit() {
    this.service.salasDeInternacion().subscribe({
      next: bundle => {
        const salas = recursosDe<Group>(bundle, 'Group');
        this.salas.set(salas);
        this.cargando.set(false);
        this.cargarPlanes(this.idsPacientesInternados(salas));
      },
      error: e => {
        this.error.set('No se pudieron consultar las salas: ' + e.message);
        this.cargando.set(false);
      },
    });
  }

  private idsPacientesInternados(salas: Group[]): string[] {
    const ids = salas
      .flatMap(sala => sala.member ?? [])
      .filter(m => !m.inactive)
      .map(m => idDeReferencia(m.entity))
      .filter((id): id is string => !!id);
    return [...new Set(ids)];
  }

  private cargarPlanes(pacienteIds: string[]) {
    if (!pacienteIds.length) {
      this.planesYPrescripciones.set({ planes: 0, prescripciones: 0 });
      return;
    }
    this.service.planesConPrescripcionesDe(pacienteIds).subscribe({
      next: bundle => {
        const prescripcionesActivas = recursosDe<MedicationRequest>(bundle, 'MedicationRequest')
          .filter(mr => mr.status === 'active').length;
        this.planesYPrescripciones.set({
          planes: recursosDe<FhirList>(bundle, 'List').length,
          prescripciones: prescripcionesActivas,
        });
      },
      error: () => this.planesYPrescripciones.set(null),
    });
  }
}
