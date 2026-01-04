import { GameScoring } from "../word-game.interface";

export class AlphabetScoring implements GameScoring {
  calculateScore(words: string[]): number {
    return words.reduce((currentScore, word) => {
      return currentScore + this.getWordScore(word);
    }, 0)
  }

  getWordScore(word: string): number {
    if (word.length <= 2) {
      return 0;
    }
    return word.length;
  }
}
