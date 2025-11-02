import { Component } from '@angular/core';
import { SpaceInvadersComponent } from './space-invaders/space-invaders.component';
import { ParticlesComponent } from "./particles/particles.component";

@Component({
  selector: 'app-root',
  imports: [ParticlesComponent, SpaceInvadersComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'rxjs-particles';
}
