import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Grupo = 'ingresar' | 'consultar';

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  templateUrl: './app-menu.component.html',
  styleUrl: './app-menu.component.css',
})
export class AppMenuComponent {
  protected readonly abierto = signal<Grupo | null>(null);

  protected alternar(grupo: Grupo) {
    this.abierto.set(this.abierto() === grupo ? null : grupo);
  }

  protected cerrar() {
    this.abierto.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.cerrar();
  }
}
