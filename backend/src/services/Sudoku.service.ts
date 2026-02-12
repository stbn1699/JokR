import {generateSudoku} from "../utils/sudokuGenerator.js";

export class SudokuService {
    // generate returns a grid with approximately numPlaced clues (could be more if target can't be reached)
    async generate(numPlaced: number): Promise<number[][]> {
        return generateSudoku(numPlaced);
    }
}
