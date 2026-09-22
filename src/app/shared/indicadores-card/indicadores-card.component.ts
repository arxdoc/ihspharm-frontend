import { Component, input } from '@angular/core';
import { ContextoItem } from '../contexto-card/contexto-card.component';

@Component({
  selector: 'app-indicadores-card',
  templateUrl: './indicadores-card.component.html',
  styleUrl: './indicadores-card.component.css',
})
export class IndicadoresCardComponent {
  readonly items = input.required<ContextoItem[]>();
}
