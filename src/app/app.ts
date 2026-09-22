import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppMenuComponent } from './shell/app-menu/app-menu.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppMenuComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
