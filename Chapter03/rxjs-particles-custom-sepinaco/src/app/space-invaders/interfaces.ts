export interface GameObject {
    x: number;
    y: number;
}

export interface State {
    delta: number;
    game: number[][];
    shipY: number;
    playerLives: number;
    isGameOver: boolean;
    score: number;
    invadersDirY: number;
    invaders: GameObject[];
    invadersShoots: GameObject[];
    shoots: GameObject[];
    shootFrequency: number;
}

export interface Input {
    dlta: number;
    key: string;
}
