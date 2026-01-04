import { GameScoring } from "../word-game.interface";

export class BoggleScoring implements GameScoring {
  calculateScore(words: string[]): number {
    return words.reduce((currentScore, word) => {
      return currentScore + this.getWordScore(word);
    }, 0)
  }

  getWordScore(word: string): number {
    switch (word.length) {
      case 3:
      case 4:
        return 1;
      case 5:
        return 2;
      case 6:
        return 3;
      case 7:
        return 5;
      default:
        if (word.length >= 8) {
          return 11;
        }
    }
    return 0;
  }
}
