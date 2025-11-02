import { Component } from '@angular/core';
import { SpaceInvadersComponent } from './space-invaders/space-invaders.component';
import { ParticlesComponent } from "./particles/particles.component";
import { BatchedMeshComponent } from './batched-mesh/batched-mesh.component';

@Component({
  selector: 'app-root',
  imports: [ParticlesComponent, SpaceInvadersComponent, BatchedMeshComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'rxjs-particles';
}
