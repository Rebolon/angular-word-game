import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BoardCase, CaseStatus, GameBehavior } from '../services/word-game.interface';
import { NgClass } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'my-letter',
  standalone: true,
  imports: [NgClass, MatRippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      matRipple
      class="letter-tile"
      [ngClass]="{
        'selected': isClicked(),
        'hover': mouseOver
      }"
      role="button"
      tabindex="0"
      (mouseover)="mouseOver = true"
      (mouseout)="mouseOver = false"
      (click)="click()"
      (keydown.enter)="click()"
      (keydown.space)="click()">
      {{case.value.value}}
    </div>
  `,
  styleUrls: ['./letter.scss']
})
export class LetterComponent {
  @Input({ required: true }) behavior!: GameBehavior;
  @Input({ required: true }) case!: BoardCase;
  protected mouseOver = false;

  protected isClicked(): boolean {
    return this.case.getStatus() === CaseStatus.CLICKED;
  }

  protected click(): void {
    switch (this.case.getStatus()) {
      case CaseStatus.CLEAR:
        this.behavior.selectCase(this.case);
        break;
      case CaseStatus.CLICKED:
        this.behavior.unSelectCase(this.case);
        break;
      default:
        console.warn('LetterComponent', 'click', 'unknown case status', this.case.getStatus());
    }
  }
}
