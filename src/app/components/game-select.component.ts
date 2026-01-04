import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GameType } from '../services/word-game.interface';
import { AsyncPipe } from '@angular/common';
import { GameSelectorForm } from '../game.form';
import { ReactiveFormsModule } from '@angular/forms';
import { DbService } from '../services/database/db.service';
import { Observable, map } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'my-game-select',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="selectGame()">
      <mat-form-field appearance="fill">
        <mat-label>Choix du mode de jeu</mat-label>
        <mat-select
            formControlName="game"
            name="game"
            title="game">
          @for (gameKey of form.getGamesKeys(); track gameKey) {
            <mat-option [value]="gameKey">
              {{ form.getGameValue(gameKey) }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
      
      <button mat-raised-button color="primary" type="submit" [disabled]="dbIsLoading() | async">
        @if (dbIsLoading() | async) {
          Chargement...
        } @else {
          Jouer
        }
      </button>
    </form>
  `,
  styleUrls: ['./game-select.scss']
})
export class GameSelectComponent {
  @Input('selected') selected!: GameType;
  @Output('selected') game: EventEmitter<GameType> = new EventEmitter();
  protected form: GameSelectorForm = new GameSelectorForm();

  constructor(protected dbService: DbService) {
  }

  selectGame(): void {
    if (this.form.invalid) {
      return;
    }

    this.game.emit(this.form.value.game)
  }

  protected dbIsLoading(): Observable<boolean> {
    return this.dbService.progress$.pipe(
      map((progress: number) => progress < 100),
    )
  }
}
