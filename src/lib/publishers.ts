/**
 * Data-access helpers for the publishers table.
 * Provides functions to query publishers from the database with injectable db instance for testability.
 */

import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieves all publishers from the database ordered by name.
 * @param db - The database instance to query from.
 * @returns A promise that resolves to an array of publishers.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
