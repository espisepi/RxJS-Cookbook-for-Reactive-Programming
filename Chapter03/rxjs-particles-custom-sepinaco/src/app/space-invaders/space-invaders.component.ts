import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { fromEvent, interval, Subscription } from 'rxjs';
import {
    map,
    scan,
    tap
} from 'rxjs/operators';
import { gameUpdate, initialState } from './game';
import { State, Input } from './interfaces';
import { empty, player, invader, shot } from './constants';

@Component({
    selector: 'app-space-invaders',
    imports: [],
    templateUrl: './space-invaders.component.html',
    styleUrl: './space-invaders.component.scss'
})
export class SpaceInvadersComponent implements OnInit, OnDestroy {
    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
    private ctx!: CanvasRenderingContext2D;
    private subscriptions: Subscription[] = [];

    private readonly cellSize = 20;
    private readonly gameSize = 20;
    private currentKey = '';

    ngOnInit() {
        this.ctx = this.canvas.nativeElement.getContext('2d')!;

        const canvasWidth = this.gameSize * this.cellSize;
        const canvasHeight = this.gameSize * this.cellSize;
        this.canvas.nativeElement.width = canvasWidth;
        this.canvas.nativeElement.height = canvasHeight;

        // Track keydown events
        this.subscriptions.push(
            fromEvent<KeyboardEvent>(document, 'keydown').subscribe(event => {
                this.currentKey = event.code;
            })
        );

        // Track keyup events
        this.subscriptions.push(
            fromEvent<KeyboardEvent>(document, 'keyup').subscribe(() => {
                this.currentKey = '';
            })
        );

        const spaceInvaders$ = interval(100).pipe(
            map((intrvl: number): Input => ({
                dlta: intrvl,
                key: this.currentKey
            })),
            scan(gameUpdate, initialState),
            tap(state => this.paint(state))
        );

        this.subscriptions.push(spaceInvaders$.subscribe());
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    private paint(state: State) {
        this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

        // Draw game info
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${state.score} Lives: ${state.playerLives}`, 10, 20);

        if (state.isGameOver) {
            this.ctx.fillText('GAME OVER!', 10, 40);
            return;
        }

        // Draw game board
        state.game.forEach((row, x) => {
            row.forEach((col, y) => {
                const color =
                    col === empty ? 'black' :
                        col === player ? 'cornflowerblue' :
                            col === invader ? 'gray' :
                                'silver';

                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(
                    y * this.cellSize + this.cellSize / 2,
                    x * this.cellSize + this.cellSize / 2 + 50,
                    this.cellSize / 2 - 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            });
        });
    }
}
