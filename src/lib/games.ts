/**
 * Injectable data-access helpers for querying games and their related
 * categories and publishers.
 */

import { and, asc, eq, or } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Retrieves all games ordered alphabetically by title.
 * @param db - The database instance to query.
 * @returns A promise resolving to all games with their related data.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Retrieves all game IDs ordered alphabetically by title.
 * @param db - The database instance to query.
 * @returns A promise resolving to the ordered game IDs.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Retrieves a single game by ID.
 * @param db - The database instance to query.
 * @param id - The game ID to find.
 * @returns A promise resolving to the game, or null when it does not exist.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/**
 * Retrieves games matching the selected category and publisher filters.
 * Multiple category IDs use OR semantics, while the publisher filter is exact.
 * @param db - The database instance to query.
 * @param categoryIds - Category IDs to match, or an empty array for no category filter.
 * @param publisherId - Publisher ID to match, or null for no publisher filter.
 * @returns A promise resolving to matching games ordered alphabetically by title.
 */
export async function getGamesByFilters(
    db: Database,
    categoryIds: number[],
    publisherId: number | null,
): Promise<Game[]> {
    const filters = [];

    if (categoryIds.length > 0) {
        filters.push(or(...categoryIds.map((categoryId) => eq(games.categoryId, categoryId))));
    }

    if (publisherId !== null) {
        filters.push(eq(games.publisherId, publisherId));
    }

    const query = baseGamesQuery(db);
    const rows = filters.length > 0
        ? await query.where(and(...filters)).orderBy(asc(games.title))
        : await query.orderBy(asc(games.title));

    return rows.map(mapGame);
}
