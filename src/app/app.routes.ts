import { Routes } from '@angular/router';
import { SalasListComponent } from './pages/salas-list/salas-list.component';
import { PacientesEnSalaComponent } from './pages/pacientes-en-sala/pacientes-en-sala.component';
import { PlanesDeMedicacionComponent } from './pages/planes-de-medicacion/planes-de-medicacion.component';
import { PlanDetalleComponent } from './pages/plan-detalle/plan-detalle.component';
import { RequerimientoDetalleComponent } from './pages/requerimiento-detalle/requerimiento-detalle.component';
import { IngresarPlanComponent } from './pages/ingresar-plan/ingresar-plan.component';
import { IhsAiChatComponent } from './pages/ihs-ai-chat/ihs-ai-chat.component';
import { ComunicacionesComponent } from './pages/comunicaciones/comunicaciones.component';

export const routes: Routes = [
  { path: '', redirectTo: 'salas', pathMatch: 'full' },
  { path: 'salas', component: SalasListComponent },
  { path: 'ingresar/plan', component: IngresarPlanComponent },
  { path: 'ihs-ai/chat', component: IhsAiChatComponent },
  { path: 'salas/:salaId', component: PacientesEnSalaComponent },
  { path: 'salas/:salaId/pacientes/:pacienteId', component: PlanesDeMedicacionComponent },
  {
    path: 'salas/:salaId/pacientes/:pacienteId/planes/:planId',
    component: PlanDetalleComponent,
  },
  {
    path: 'salas/:salaId/pacientes/:pacienteId/planes/:planId/comunicaciones',
    component: ComunicacionesComponent,
  },
  {
    path: 'salas/:salaId/pacientes/:pacienteId/prescripciones/:prescripcionId',
    component: RequerimientoDetalleComponent,
  },
];
