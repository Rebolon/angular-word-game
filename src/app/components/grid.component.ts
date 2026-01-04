import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { AlphabetGame, BoardCase, Game } from '../services/word-game.interface';
import { CountDownComponent } from './countdown.component';
import { LetterComponent } from './letter.component';
import { ScoreComponent } from './score.component';
import { WordsComponent } from './words.component';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'my-grid',
  standalone: true,
  imports: [LetterComponent, WordsComponent, CountDownComponent, ScoreComponent, MatButtonModule, NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (board) {
    <div class="game-container">
      <div class="game-main">
        <div class="game-header glass-panel">
          @if (countDownIsStarted() && !countDownIsEnded()) {
            <my-countdown [starTime]="countDown()" (ended)="stopGame()" (started)="startGame()"/>
          } @else if (!countDownIsStarted() && countDownIsEnded()) {
            <h2>Partie finie</h2>
          } @else {
            <h2>Prêt ?</h2>
          }

          @if (board.gameBehavior.isStopped()) {
            <my-score [gameScoring]="board.scoring" [words]="board.gameBehavior.getWords()"></my-score>
          }
        </div>

        <div class="letter-grid glass-panel" [ngStyle]="{'--cols': board.boardConfig.cols}" [class.disabled]="board.gameBehavior.isStopped()">
          @for (row of board.gameBehavior.gridCases; track row) {
            @for (col of row; track col) {
              <my-letter [case]="col" [behavior]="board.gameBehavior"></my-letter>
            }
          }
        </div>

        <div class="game-controls glass-panel">
          <button mat-raised-button color="primary" (click)="validateWord()" [disabled]="board.gameBehavior.isStopped()">Valider</button>
          <button mat-raised-button color="accent" (click)="cancelWord()" [disabled]="board.gameBehavior.isStopped()">Annuler</button>
          @if (board.gameBehavior.isStopped()) {
            <button mat-raised-button color="primary" (click)="restart()">Rejouer</button>
          }
        </div>
      </div>

      <div class="words-panel glass-panel">
        <div class="panel-header">Mots trouvés</div>
        <my-words [board]="board" />
      </div>
    </div>
  }
  `,
  styleUrls: ['./grid.scss']
})
export class GridComponent implements OnChanges {
  @Input({ required: true }) game!: AlphabetGame;
  protected board!: Game;
  protected countDown = signal(0);
  protected countDownIsStarted = signal(false);
  protected countDownIsEnded = signal(false);
  private destroy = inject(DestroyRef)

  constructor(private toastrService: ToastrService) { }

  public ngOnChanges(changes: SimpleChanges): void {
    const game = changes['game'].currentValue as AlphabetGame;
    game.currentGame$.pipe(takeUntilDestroyed(this.destroy)).subscribe((currentGame) => this.board = currentGame)
    this.restart()
  }

  protected validateWord(): void {
    try {
      this.board.gameBehavior.validateWord().pipe(takeUntilDestroyed(this.destroy)).subscribe({
        error: (err) => this.toastrService.warning(err.message)
      });
    } catch (e) {
      this.toastrService.warning((e as Error).message);
    }
  }

  protected cancelWord(): void {
    this.board.gameBehavior.cancelSelectedWord();
  }

  protected stopGame(): void {
    this.board.gameBehavior.stop();
    this.countDownIsEnded.set(true);
    this.countDownIsStarted.set(false);
  }

  protected startGame(): void {
    this.countDownIsStarted.set(true);
  }

  protected restart(): void {
    this.game.prepare();
    this.countDown.set(120)
    this.countDownIsEnded.set(false);
    this.countDownIsStarted.set(true);
  }
}
