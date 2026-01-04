import { BehaviorSubject, Observable, from, map, of, switchMap, tap, finalize } from 'rxjs';
import { Lang, db } from './database/db';
import { BoardCase, BoardConfig, Coordinates, GameBehavior as GameBehaviorI } from './word-game.interface';
import { liveQuery } from 'dexie';

// @todo where is the right place for this ?
// * in the Game ?
// * int the BoardCase ?
export class GameBehavior implements GameBehaviorI {
  private selectedCases: BoardCase[] = [];
  #words: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  public words$ = this.#words.asObservable();
  private stopped: boolean = false;
  constructor(private boardConfig: BoardConfig, public readonly gridCases: BoardCase[][]) {
  }

  stop(): void {
    this.stopped = true;
  }

  validateWord(): Observable<boolean> {
    const selectedCases = Array.from(this.selectedCases);
    const currentWord = selectedCases.length ?
      selectedCases
        .reverse()
        .map((boardCase: BoardCase) => boardCase.value.value)
        .reduce((boardCaseValue, accumulator = "") => `${accumulator}${boardCaseValue}`) : '';

    return of(currentWord).pipe(
      map(word => {
        if (this.isAlreadyExistingWord(word)) {
          throw new Error("Word already found");
        }

        if (!this.hasMinimalLenght(word)) {
          throw new Error("Minimum length is 3 characters");
        }
        return word;
      }),
      switchMap(word => this.isRealWord(word).pipe(
        map(isRealWord => {
          if (isRealWord) {
            const currentWords = this.#words.getValue();
            this.#words.next([...currentWords, word].sort());
            return true;
          }
          throw new Error("Unknown word");
        })
      )),
      finalize(() => this.cancelSelectedWord())
    );
  }

  cancelSelectedWord(): void {
    Array.from(this.selectedCases).reverse().forEach(boardCase => this.unSelectCase(boardCase))
    this.selectedCases = [];
  }

  canSelectCase(boardCase: BoardCase): boolean {
    if (this.isStopped()) {
      return false;
    }

    if (!this.isInTheBoard(boardCase)) {
      return false;
    }

    if (this.isFirstCaseInSeries()) {
      return true;
    }

    if (this.isAlreadyClickedCaseInCurrentSeries(boardCase)) {
      return false;
    }

    try {
      return this.isAroundLastClickedCase(boardCase);
    } catch (error) {
      console.info('CaseBehavior', 'canSelectCase', error);
      return true;
    }
  }

  canUnSelectCase(boardCase: BoardCase): boolean {
    if (this.isStopped()) {
      return false;
    }

    if (!this.isInTheBoard(boardCase)) {
      return false;
    }

    if (this.isLastCaseInSeries(boardCase)) {
      return true;
    }

    return false;
  }

  selectCase(boardCase: BoardCase): void {
    if (!this.canSelectCase(boardCase)) {
      return;
    }

    this.selectedCases.push(boardCase);
    boardCase.selectCase();
  }

  unSelectCase(boardCase: BoardCase): void {
    if (!this.canUnSelectCase(boardCase)) {
      return;
    }

    this.selectedCases = this.selectedCases.filter((currentBoardCase: BoardCase) => currentBoardCase !== boardCase);
    boardCase.unSelectCase();
  }

  getWords(): string[] {
    return this.#words.getValue();
  };

  public isStopped(): boolean {
    return this.stopped;
  }

  private isAlreadyExistingWord(currentWord: string): boolean {
    const words: string[] = this.getWords();


    return !!words.find((word) => word === currentWord);
  }

  private hasMinimalLenght(currentWord: string): boolean {
    return currentWord.length > 2;
  }

  private isRealWord(currentWord: string): Observable<boolean> {
    return from(db.words.where("value").equalsIgnoreCase(currentWord).count()).pipe(
      map((value: number) => !!value)
    );
  }

  private isInTheBoard(boardCase: BoardCase): boolean {
    return boardCase.coordinates.x >= 0 && boardCase.coordinates.x < this.boardConfig.cols
      && boardCase.coordinates.y >= 0 && boardCase.coordinates.y < this.boardConfig.rows;
  }

  private isFirstCaseInSeries(): boolean {
    return !this.selectedCases.length
  }

  private isLastCaseInSeries(boardCase: BoardCase): boolean {
    return this.selectedCases.at(-1) === boardCase;
  }

  private isAlreadyClickedCaseInCurrentSeries(boardCase: BoardCase): boolean {
    return !!this.selectedCases.find((selectedBoardCase) => selectedBoardCase === boardCase);
  }

  private isAroundLastClickedCase(boardCase: BoardCase): boolean {
    const lastClickedCase = this.selectedCases.at(-1);

    if (!lastClickedCase) {
      throw new Error('No cases in series');
    }

    const allowedCoordinates = this.buildAllowedCoordinates(lastClickedCase);

    return !!allowedCoordinates.find((coordinates) =>
      coordinates.x === boardCase.coordinates.x
      && coordinates.y === boardCase.coordinates.y)
  }

  private buildAllowedCoordinates(lastClickedCase: BoardCase): Coordinates[] {
    const allowedCoordinates = [] as Coordinates[];
    const abscissas = this.buildAllowedCoordinatesAbscissa(lastClickedCase);
    const ordinates = this.buildAllowedCoordinatesOrdinate(lastClickedCase);

    abscissas.forEach((abscissa) => {
      ordinates.forEach((ordinate) => {
        const newCoordinate = {
          x: abscissa,
          y: ordinate
        };

        if (JSON.stringify(newCoordinate) !== JSON.stringify(lastClickedCase.coordinates)) {
          allowedCoordinates.push(newCoordinate);
        }
      })
    })

    return allowedCoordinates;
  }

  private buildAllowedCoordinatesAbscissa(lastClickedCase: BoardCase): number[] {
    let allowedAbscissa: number[] = [];
    for (let i = -1; i <= 1; i++) {
      const newAbscissa = lastClickedCase.coordinates.x + i;
      if (newAbscissa >= 0
        && newAbscissa < this.boardConfig.cols) {
        allowedAbscissa.push(newAbscissa);
      }
    }

    return allowedAbscissa;
  }

  private buildAllowedCoordinatesOrdinate(lastClickedCase: BoardCase): number[] {
    let allowedOrdinate: number[] = [];
    for (let i = -1; i <= 1; i++) {
      const newOrdinate = lastClickedCase.coordinates.y + i;
      if (newOrdinate >= 0
        && newOrdinate < this.boardConfig.rows) {
        allowedOrdinate.push(newOrdinate);
      }
    }

    return allowedOrdinate;
  }
}
