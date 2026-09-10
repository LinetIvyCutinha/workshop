import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by one or more categories and publisher', async () => {
        const [strategy] = await db
            .insert(categories)
            .values([
                { name: 'Strategy', description: 'strategy' },
                { name: 'Puzzle', description: 'puzzle' },
            ])
            .returning({ id: categories.id });
        const categoryRows = await db.select({ id: categories.id, name: categories.name }).from(categories);
        const strategyId = categoryRows.find((row) => row.name === 'Strategy')?.id ?? strategy.id;
        const puzzleId = categoryRows.find((row) => row.name === 'Puzzle')?.id;
        const [firstPublisher, secondPublisher] = await db
            .insert(publishers)
            .values([
                { name: 'Pub One', description: 'first' },
                { name: 'Pub Two', description: 'second' },
            ])
            .returning({ id: publishers.id });

        await db.insert(games).values([
            {
                title: 'Puzzle Game',
                description: 'Puzzle',
                starRating: 4,
                categoryId: puzzleId!,
                publisherId: firstPublisher.id,
            },
            {
                title: 'Strategy Game',
                description: 'Strategy',
                starRating: 4,
                categoryId: strategyId,
                publisherId: firstPublisher.id,
            },
            {
                title: 'Other Publisher Game',
                description: 'Other publisher',
                starRating: 4,
                categoryId: strategyId,
                publisherId: secondPublisher.id,
            },
        ]);

        const categoryMatches = await getGamesByFilters(db, [puzzleId!, strategyId], null);
        expect(categoryMatches.map((game) => game.title)).toEqual([
            'Other Publisher Game',
            'Puzzle Game',
            'Strategy Game',
        ]);

        const combinedMatches = await getGamesByFilters(db, [strategyId], firstPublisher.id);
        expect(combinedMatches.map((game) => game.title)).toEqual(['Strategy Game']);
    });

    it('returns no games when filters do not match', async () => {
        await seedGames(db, 2);
        expect(await getGamesByFilters(db, [99999], null)).toEqual([]);
    });
});
