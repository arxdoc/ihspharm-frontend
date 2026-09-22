import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface MensajeChat {
  autor: 'usuario';
  texto: string;
  hora: string;
}

function horaActual(): string {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

@Component({
  selector: 'app-ihs-ai-chat',
  imports: [FormsModule],
  templateUrl: './ihs-ai-chat.component.html',
  styleUrl: './ihs-ai-chat.component.css',
})
export class IhsAiChatComponent {
  protected mensaje = '';
  protected readonly mensajes = signal<MensajeChat[]>([]);

  protected enviar() {
    const texto = this.mensaje.trim();
    if (!texto) return;
    this.mensajes.update(actuales => [...actuales, { autor: 'usuario', texto, hora: horaActual() }]);
    this.mensaje = '';
  }

  protected onEnter(event: Event) {
    const teclado = event as KeyboardEvent;
    if (teclado.shiftKey) return;
    teclado.preventDefault();
    this.enviar();
  }
}
