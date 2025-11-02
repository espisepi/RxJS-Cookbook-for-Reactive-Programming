import { State, Input, GameObject } from './interfaces';
import { empty, player, invader, shot, noOfInvadersRows } from './constants';

const gameObject = (x: number, y: number): GameObject => ({ x: x, y: y });
const gameSize = 10;
const clearGame = () =>
  Array(gameSize)
    .fill(empty)
    .map(e => Array(gameSize).fill(empty));

const createInvaders = (): GameObject[] =>
  Array.from(Array(noOfInvadersRows).keys()).reduce(
    (invds: GameObject[], row: number) => [...invds, ...createRowOfInvaders(row)],
    []
  );
const createRowOfInvaders = (row: number): GameObject[] =>
  Array.from(Array(gameSize / 2).keys())
    .filter(e => (row % 2 === 0 ? e % 2 === 0 : e % 2 !== 0))
    .map(e => gameObject(row, e + 4));

const invadersDirection = (state: State): number =>
  state.invaders.length && state.invaders[0].y <= 0
    ? 1
    : state.invaders.length &&
      state.invaders[state.invaders.length - 1].y >= gameSize - 1
      ? -1
      : state.invadersDirY;

const drawGame = (state: State): number[][] => (
  keepShipWithinGame(state),
  (state.game = clearGame()),
  (state.game[state.game.length - 1][state.shipY] = player),
  state.invaders.forEach(i => (state.game[i.x][i.y] = invader)),
  state.invadersShoots.forEach(s => (state.game[s.x][s.y] = shot)),
  state.shoots.forEach(s => (state.game[s.x][s.y] = shot)),
  state.game
);

const addInvaderShoot = (state: State): GameObject =>
  (randomInvader => gameObject(randomInvader.x, randomInvader.y))(
    state.invaders[Math.floor(Math.random() * state.invaders.length)]
  );

const collision = (e1: GameObject, e2: GameObject): boolean => e1.x === e2.x && e1.y === e2.y;
const filterOutCollisions = (c1: GameObject[], c2: GameObject[]): GameObject[] =>
  c1.filter(e1 => !c2.find(e2 => collision(e1, e2)));
const updateScore = (state: State): number =>
  state.shoots.find(s => state.invaders.find(i => collision(s, i)))
    ? state.score + 1
    : state.score;

const updateState = (state: State): State => {
  const filteredInvaders = filterOutCollisions(state.invaders, state.shoots);
  const updatedInvaders = !state.invaders.length
    ? createInvaders()
    : filteredInvaders.map(i =>
      state.delta % 10 === 0
        ? gameObject(
          i.x + (state.delta % (state.shootFrequency + 10) === 0 ? 1 : 0),
          i.y + state.invadersDirY
        )
        : i
    );

  const newInvadersShoots = state.delta % state.shootFrequency === 0
    ? [...state.invadersShoots, addInvaderShoot({ ...state, invaders: state.invaders })]
    : state.invadersShoots;

  const movedInvadersShoots = newInvadersShoots
    .filter(e => e.x < gameSize - 1)
    .map(e => gameObject(e.x + 1, e.y));

  const updatedShoots = filterOutCollisions(state.shoots, state.invaders)
    .filter(e => e.x > 0)
    .map(e => gameObject(e.x - 1, e.y));

  const newScore = updateScore(state);
  const hasLostLife = state.invadersShoots.some(
    e => e.x === gameSize - 1 && e.y === state.shipY
  );
  const newPlayerLives = hasLostLife ? state.playerLives - 1 : state.playerLives;
  const newInvadersDirY = invadersDirection({ ...state, invaders: updatedInvaders });

  // Create updated state for drawing
  const stateForDrawing: State = {
    ...state,
    invaders: updatedInvaders,
    invadersShoots: movedInvadersShoots,
    shoots: updatedShoots,
    shipY: state.shipY,
    playerLives: newPlayerLives,
    score: newScore,
    invadersDirY: newInvadersDirY
  };

  return {
    delta: state.delta,
    game: drawGame(stateForDrawing),
    shipY: state.shipY,
    playerLives: newPlayerLives,
    isGameOver: newPlayerLives <= 0,
    score: newScore,
    invadersDirY: newInvadersDirY,
    invaders: updatedInvaders,
    invadersShoots: movedInvadersShoots,
    shoots: updatedShoots,
    shootFrequency: !state.invaders.length
      ? state.shootFrequency - 5
      : state.shootFrequency
  };
};

const keepShipWithinGame = (state: State): void => {
  if (state.shipY < 0) {
    state.shipY = 0;
  }
  if (state.shipY >= gameSize - 1) {
    state.shipY = gameSize - 1;
  }
};

const updateShipY = (state: State, input: Input): void => {
  if (input.key === 'ArrowLeft') {
    state.shipY -= 1;
  } else if (input.key === 'ArrowRight') {
    state.shipY += 1;
  }
};

const addShots = (state: State, input: Input): void => {
  if (input.key === 'Space') {
    state.shoots = [...state.shoots, gameObject(gameSize - 2, state.shipY)];
  }
};

const isGameOver = (state: State): boolean =>
  state.playerLives <= 0 ||
  (state.invaders.length > 0 &&
    state.invaders[state.invaders.length - 1].x >= gameSize - 1);

export const initialState: State = {
  delta: 0,
  game: clearGame(),
  shipY: 10,
  playerLives: 3,
  isGameOver: false,
  score: 0,
  invadersDirY: 1,
  invaders: createInvaders(),
  invadersShoots: [],
  shoots: [],
  shootFrequency: 20
};

const processInput = (state: State, input: Input): void => {
  updateShipY(state, input);
  addShots(state, input);
};

const whileNotGameOver = (state: State, input: Input): void => {
  if (!isGameOver(state)) {
    state.delta = input.dlta;
  }
};

export const gameUpdate = (state: State, input: Input): State => {
  whileNotGameOver(state, input);
  processInput(state, input);
  return updateState(state);
};
