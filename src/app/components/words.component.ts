import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Game } from '../services/word-game.interface';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'my-words',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="words-list">
      @if (words$ | async; as words) {
        @if (words.length) {
          @for (word of words; track word) {
            <li>
              <span class="word-text">{{word}}</span>
              <span class="word-points">+{{getWordScore(word)}}</span>
            </li>
          }
        } @else {
          <li class="empty-message">Aucun mot trouvé</li>
        }
      }
    </ul>
  `,
  styleUrls: ['./words.scss']
})
export class WordsComponent {
  @Input() board!: Game;

  get words$() {
    return this.board?.gameBehavior.words$;
  }

  protected getWordScore(word: string): number {
    return this.board.scoring.getWordScore(word);
  }
}
