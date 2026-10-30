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

interface FilterFixtureIds {
    strategy: number;
    puzzle: number;
    publisherOne: number;
    publisherTwo: number;
}

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

async function seedFilterGames(db: Database): Promise<FilterFixtureIds> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'cat' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Zulu Tactics',
            description: 'Strategy from publisher one',
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Alpha Strategy',
            description: 'Strategy from publisher two',
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
        {
            title: 'Beta Puzzler',
            description: 'Puzzle from publisher one',
            categoryId: puzzle.id,
            publisherId: publisherOne.id,
        },
    ]);

    return {
        strategy: strategy.id,
        puzzle: puzzle.id,
        publisherOne: publisherOne.id,
        publisherTwo: publisherTwo.id,
    };
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

    it('filters by any selected category and keeps title ordering', async () => {
        const fixture = await seedFilterGames(db);

        const results = await getGamesByFilters(db, {
            categoryIds: [fixture.strategy, fixture.puzzle],
        });

        expect(results.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzler',
            'Zulu Tactics',
        ]);
    });

    it('filters by publisher', async () => {
        const fixture = await seedFilterGames(db);

        const results = await getGamesByFilters(db, {
            publisherId: fixture.publisherTwo,
        });

        expect(results.map((game) => game.title)).toEqual(['Alpha Strategy']);
    });

    it('combines category and publisher filters', async () => {
        const fixture = await seedFilterGames(db);

        const results = await getGamesByFilters(db, {
            categoryIds: [fixture.strategy],
            publisherId: fixture.publisherOne,
        });

        expect(results.map((game) => game.title)).toEqual(['Zulu Tactics']);
    });

    it('treats an empty category selection as no category filter', async () => {
        await seedFilterGames(db);

        const results = await getGamesByFilters(db, { categoryIds: [] });

        expect(results.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzler',
            'Zulu Tactics',
        ]);
    });

    it('returns no games when filters do not match', async () => {
        await seedFilterGames(db);

        const results = await getGamesByFilters(db, {
            categoryIds: [99999],
        });

        expect(results).toEqual([]);
    });
});
