import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {DailyRepository} from "../repository/Daily.repository.js";
import {DailyService} from "./Daily.service.js";
import {SudokuService} from "./Sudoku.service.js";
import {BineroService} from "./Binero.service.js";

// Construit le service du défi du jour (utilisé par les routes /daily, /sudoku et /binero)
export function createDailyService(db: Kysely<DB>): DailyService {
    return new DailyService(new DailyRepository(db), new SudokuService(), new BineroService());
}
