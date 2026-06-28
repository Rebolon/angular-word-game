import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { AlphabetGame, BoardCase, Game } from '../services/word-game.interface';
import { CountDownComponent } from './countdown.component';
import { LetterComponent } from './letter.component';
import { ScoreComponent } from './score.component';
import { WordsComponent } from './words.component';
import { ReplaySubject, switchMap, tap } from 'rxjs';

@Component({
  selector: 'my-grid',
  standalone: true,
  imports: [LetterComponent, WordsComponent, CountDownComponent, ScoreComponent, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (board) {
    <div class="game-container">
      <div class="game-main">
        <div class="game-header glass-panel">
          <div class="timer-section">
            @if (countDownIsStarted() && !countDownIsEnded()) {
              <div class="timer-badge">
                <span class="timer-icon">⏱️</span>
                <my-countdown [starTime]="countDown()" (ended)="stopGame()" (started)="startGame()"/>
              </div>
            } @else if (!countDownIsStarted() && countDownIsEnded()) {
              <h2 class="status-title finished">Partie finie</h2>
            } @else {
              <h2 class="status-title ready">Prêt ?</h2>
            }
          </div>

          <!-- Horizontal stream of latest found words (visible during play) -->
          @if (countDownIsStarted() && !countDownIsEnded()) {
            <div class="latest-words-stream">
              @for (word of latestWords(); track word) {
                <span class="latest-word-tag animate-slide-in">
                  {{ word }}
                  <span class="tag-points">+{{ board.scoring.getWordScore(word) }}</span>
                </span>
              }
            </div>
          }

          <div class="score-section">
            @if (board.gameBehavior.isStopped()) {
              <my-score [gameScoring]="board.scoring" [words]="board.gameBehavior.getWords()"></my-score>
            }
          </div>
        </div>

        <div class="letter-grid glass-panel" [style.--cols]="board.boardConfig.cols" [class.disabled]="board.gameBehavior.isStopped()">
          @for (row of board.gameBehavior.gridCases; track row) {
            @for (col of row; track col) {
              <my-letter [case]="col" [behavior]="board.gameBehavior"></my-letter>
            }
          }
        </div>

        <div class="game-controls glass-panel">
          <button mat-raised-button color="primary" class="control-btn btn-validate" (click)="validateWord()" [disabled]="board.gameBehavior.isStopped()">Valider</button>
          <button mat-raised-button color="accent" class="control-btn btn-cancel" (click)="cancelWord()" [disabled]="board.gameBehavior.isStopped()">Annuler</button>
          <button mat-raised-button class="control-btn btn-back" (click)="back.emit()">Menu</button>
          @if (board.gameBehavior.isStopped()) {
            <button mat-raised-button color="primary" class="control-btn btn-replay" (click)="restart()">Rejouer</button>
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
  @Output() back = new EventEmitter<void>();
  
  protected board!: Game;
  protected countDown = signal(0);
  protected countDownIsStarted = signal(false);
  protected countDownIsEnded = signal(false);
  protected latestWords = signal<string[]>([]);
  
  private destroy = inject(DestroyRef);
  private gameSubject = new ReplaySubject<AlphabetGame>(1);

  constructor(private toastrService: ToastrService) {
    // Setup reactive stream to handle game changes and track chronological words
    this.gameSubject.pipe(
      switchMap((game) => game.currentGame$),
      tap((currentGame) => {
        this.board = currentGame;
        this.latestWords.set([]);
      }),
      switchMap((currentGame) => currentGame.gameBehavior.chronologicalWords$),
      takeUntilDestroyed(this.destroy)
    ).subscribe((words) => {
      // Get the last 3 found words in reverse order (most recent first)
      const lastThree = words.slice(-3).reverse();
      this.latestWords.set(lastThree);
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['game']) {
      this.gameSubject.next(changes['game'].currentValue as AlphabetGame);
      this.restart();
    }
  }

  protected validateWord(): void {
    try {
      this.board.gameBehavior.validateWord().pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (isValid) => {
          if (isValid) {
            // Optional: visual feedback trigger could be added here
          }
        },
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
    this.countDown.set(120);
    this.countDownIsEnded.set(false);
    this.countDownIsStarted.set(true);
  }
}
