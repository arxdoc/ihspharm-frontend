import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FhirService } from '../../core/fhir.service';
import { PrescripcionEntrada } from '../../core/fhir.models';

function nuevaPrescripcion(): PrescripcionEntrada {
  return {
    codigoMedicamento: '',
    nombreMedicamento: '',
    dosisValor: NaN,
    dosisUnidad: '',
    horas: NaN,
    dias: NaN,
  };
}

function fechaLocalActual(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-ingresar-plan',
  imports: [FormsModule, RouterLink],
  templateUrl: './ingresar-plan.component.html',
  styleUrl: './ingresar-plan.component.css',
})
export class IngresarPlanComponent {
  private service = inject(FhirService);

  protected codigoPlan = '';
  protected titulo = '';
  protected pacienteCodigo = '';
  protected profesionalId = '';
  protected fecha = fechaLocalActual();
  protected prescripciones: PrescripcionEntrada[] = [nuevaPrescripcion()];

  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal<{ pacienteCodigo: string; codigoPlan: string } | null>(null);

  protected agregarPrescripcion() {
    this.prescripciones.push(nuevaPrescripcion());
  }

  protected quitarPrescripcion(i: number) {
    this.prescripciones.splice(i, 1);
  }

  protected nuevoPlan() {
    this.codigoPlan = '';
    this.titulo = '';
    this.pacienteCodigo = '';
    this.profesionalId = '';
    this.fecha = fechaLocalActual();
    this.prescripciones = [nuevaPrescripcion()];
    this.error.set('');
    this.exito.set(null);
  }

  private formularioValido(): boolean {
    if (!this.codigoPlan.trim() || !this.titulo.trim() || !this.pacienteCodigo.trim() || !this.profesionalId.trim()) {
      return false;
    }
    return this.prescripciones.every(
      rx =>
        rx.codigoMedicamento.trim() &&
        rx.nombreMedicamento.trim() &&
        rx.dosisUnidad.trim() &&
        Number.isFinite(rx.dosisValor) &&
        Number.isFinite(rx.horas) &&
        rx.horas > 0 &&
        Number.isFinite(rx.dias) &&
        rx.dias > 0,
    );
  }

  protected enviar() {
    if (!this.formularioValido()) {
      this.error.set('Completá todos los campos requeridos antes de guardar.');
      return;
    }

    this.error.set('');
    this.enviando.set(true);

    this.service
      .crearPlanDeMedicacion({
        codigoPlan: this.codigoPlan,
        titulo: this.titulo,
        pacienteCodigo: this.pacienteCodigo,
        profesionalId: this.profesionalId,
        fecha: new Date(this.fecha).toISOString(),
        prescripciones: this.prescripciones,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.exito.set({
            pacienteCodigo: this.pacienteCodigo.trim(),
            codigoPlan: this.codigoPlan.trim(),
          });
        },
        error: e => {
          this.enviando.set(false);
          const detalle = e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'error desconocido';
          this.error.set('No se pudo guardar el plan: ' + detalle);
        },
      });
  }
}
