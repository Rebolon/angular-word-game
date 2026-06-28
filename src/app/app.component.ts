import {Component, OnInit} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {GridComponent} from './components/grid.component';
import {Boggle} from './services/boggle/boggle.service';
import {Alphabet} from './services/alphabet/alphabet.service';
import {TitleComponent} from './components/title.component';
import {GameSelectComponent} from './components/game-select.component';
import {AlphabetGame, GameType} from './services/word-game.interface';
import {ToastrService } from 'ngx-toastr';
import { MESSAGES_RESPONSE } from './services/database/messages-response';
import { DbService } from './services/database/db.service';

@Component({
    selector: 'my-app',
    imports: [TitleComponent, GridComponent, GameSelectComponent],
    providers: [Alphabet, Boggle],
    template: `
    <header>
      <my-title/>
    </header>
    <main>
      @if (game) {
        <my-grid [game]="game" (back)="onBack()" />
      } @else {
        <my-game-select [selected]="defaultGame" (selected)="onSelected($event)" />
      }
    </main>
    <footer>
    </footer>
  `,
    styleUrls: ['./app.scss',]
})
export class AppComponent implements OnInit {
  protected defaultGame = GameType.Alphabet
  protected game!: AlphabetGame;

  constructor(private toastrService: ToastrService, private dbService: DbService) {}

  ngOnInit(): void {
    this.dbService.workerMessages$.subscribe(
      (workerMessage) => {
        switch (workerMessage.message) {
          case MESSAGES_RESPONSE.DB_START_POPULATE:
          case MESSAGES_RESPONSE.DB_POPULATED:
            this.toastrService[workerMessage.type](workerMessage.detail);
            break;
          case MESSAGES_RESPONSE.DB_IN_PROGRESS:
            this.toastrService[workerMessage.type](workerMessage.detail, undefined, {timeOut: 1000});
            break;
          case MESSAGES_RESPONSE.INFO:
            console.info(workerMessage.detail)
            break;
          case MESSAGES_RESPONSE.ERROR:
            console.warn(workerMessage.detail)
            break;
          default:
            this.toastrService[workerMessage.type](workerMessage.detail);
        }
      }
    );
  }

  protected onSelected(game: any) {
    switch (game) {
      case GameType.Alphabet:
        this.game = new Alphabet();
        break;
      case GameType.Boggle:
        this.game = new Boggle();
        break;
      default:
        console.error('Unknown Game received');
    }
  }

  protected onBack(): void {
    this.game = undefined as any;
  }
}
