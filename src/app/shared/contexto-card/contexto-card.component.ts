import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ContextoItem {
  label: string;
  valor: string;
  link?: unknown[];
}

@Component({
  selector: 'app-contexto-card',
  imports: [RouterLink],
  templateUrl: './contexto-card.component.html',
  styleUrl: './contexto-card.component.css',
})
export class ContextoCardComponent {
  readonly items = input.required<ContextoItem[]>();
  readonly titulo = input('Contexto');
  readonly alerta = input(false);
}
