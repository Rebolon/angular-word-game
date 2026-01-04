import { BoardCase, BoardConfig, CaseStatus, CaseValue } from "./word-game.interface";
import { GameBehavior } from "./game-behavior.service";

describe('GameBehavior', () => {
    let sut: GameBehavior;
    let caseValue: CaseValue = { value: "A" };
    let boardConfig: BoardConfig = {
        cols: 5,
        rows: 5
    };

    beforeEach(() => { });

    it('can not click outside the board', () => {
        sut = new GameBehavior(boardConfig, []);
        const boardCase = new BoardCase({ x: 10, y: 10 }, caseValue);
        expect(sut.canSelectCase(boardCase)).toBeFalse();
    });

    it('can click anywhere in an empty board', () => {
        sut = new GameBehavior(boardConfig, []);
        const boardCase = new BoardCase({ x: 0, y: 0 }, caseValue);
        expect(sut.canSelectCase(boardCase)).toBeTrue();
    });

    it('can click on an unselected case aside last clicked case', () => {
        [
            { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
            { x: 1, y: 2 }, { x: 3, y: 2 },
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
        ].forEach(coordinates => {
            sut = new GameBehavior(boardConfig, []);
            const clickedBoardCase = new BoardCase({ x: 2, y: 2 }, caseValue);
            sut.selectCase(clickedBoardCase);
            const newBoardCase = new BoardCase(coordinates, { value: "Z" });
            expect(sut.canSelectCase(newBoardCase)).toBeTrue();
        });
    });

    it('cannot click on an unselected case not aside the last clicked case', () => {
        [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
            { x: 0, y: 1 }, { x: 4, y: 1 },
            { x: 0, y: 2 }, { x: 4, y: 2 },
            { x: 0, y: 3 }, { x: 4, y: 3 },
            { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        ].forEach(coordinates => {
            sut = new GameBehavior(boardConfig, []);
            const clickedBoardCase = new BoardCase({ x: 2, y: 2 }, caseValue);
            sut.selectCase(clickedBoardCase);
            const newBoardCase = new BoardCase(coordinates, { value: "Z" });
            expect(sut.canSelectCase(newBoardCase)).toBeFalse();
        });
    });

    it('can click on the last clicked selected case', () => {
        sut = new GameBehavior(boardConfig, []);
        const clickedCases = [
            new BoardCase({ x: 1, y: 2 }, { value: "A" }),
            new BoardCase({ x: 2, y: 2 }, { value: "B" }),
            new BoardCase({ x: 3, y: 2 }, { value: "C" }),
        ];
        clickedCases.forEach(boardCase => sut.selectCase(boardCase));
        expect(sut.canUnSelectCase(clickedCases[2])).toBeTrue();
    });

    it('cannot click on not last clicked selected case', () => {
        sut = new GameBehavior(boardConfig, []);
        const clickedCases = [
            new BoardCase({ x: 1, y: 2 }, { value: "A" }),
            new BoardCase({ x: 2, y: 2 }, { value: "B" }),
            new BoardCase({ x: 3, y: 2 }, { value: "C" }),
        ];
        clickedCases.forEach(boardCase => sut.selectCase(boardCase));

        expect(sut.canUnSelectCase(clickedCases[0])).toBeFalse();
        expect(sut.canUnSelectCase(clickedCases[1])).toBeFalse();
    })
});