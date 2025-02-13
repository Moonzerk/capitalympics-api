import prisma from '../prisma';
import { LearningType } from './common';

interface UserScore {
    user_id: number;
    country_id: number;
    learning_type: LearningType;
    succeeded: number;
    medium: number;
    failed: number;
    score?: number;
}

interface UserScoreFromDB {
    user_id: number;
    country_id: number;
    learning_type: LearningType;
    succeeded: number;
    medium: number;
    failed: number;
}

export function calculateScore(
    succeeded_count: number,
    medium_count: number,
    failed_count: number
): number {
    let score: number = 0;
    const total: number =
        parseInt(succeeded_count.toString()) +
        parseInt(medium_count.toString()) +
        parseInt(failed_count.toString());
    if (total === 0) {
        return -1;
    }

    const succeeded_percentage = succeeded_count / total;
    const medium_percentage = medium_count / total;
    const failed_percentage = failed_count / total;

    // -- Weighted scores percentage -- //
    const weighted_succeeded_percentage = Math.min(
        succeeded_percentage * 6,
        1.1
    );
    const weighted_medium_percentage = Math.min(medium_percentage * 2, 1);
    const weighted_failed_percentage = failed_percentage * 4;

    // -- Final score -- //
    // The score is calculated with a logarithmic function to avoid
    // achieving a high score with a few questions
    score = Math.round(
        ((weighted_succeeded_percentage * 100 -
            weighted_medium_percentage * 10 -
            weighted_failed_percentage * 25) *
            Math.log10(succeeded_count + 1)) /
            1.625
    );
    // Score between 0 and 100
    return Math.floor(Math.max(0, Math.min(score, 100)));
}

export async function getOverallScores(userId: number) {
    const flagScores = await getUserResultsCounters(userId, 'flag');
    const capitalScores = await getUserResultsCounters(userId, 'capital');

    flagScores.map(
        (s) => (s.score = calculateScore(s.succeeded, s.medium, s.failed))
    );

    const flagAvg =
        flagScores.reduce((acc, s) => acc + s.score!, 0) / flagScores.length;

    capitalScores.map(
        (s) => (s.score = calculateScore(s.succeeded, s.medium, s.failed))
    );

    const capitalAvg =
        capitalScores.reduce((acc, s) => acc + s.score!, 0) /
        capitalScores.length;

    return {
        capital: capitalAvg,
        flag: flagAvg
    };
}

export async function getUserResultsCounters(
    userId: number,
    learningType: LearningType,
    continentId?: number,
    countryId?: number
): Promise<UserScore[]> {
    const joins = [];
    const wheres = [
        `s.user_id = ${userId}`,
        `s.learning_type = '${learningType}'`
    ];

    if (continentId) {
        joins.push(
            `LEFT JOIN Country AS c ON s.country_id = c.id`,
            `LEFT JOIN Region AS r ON c.region_id = r.id`
        );
        wheres.push(`r.continent_id = ${continentId}`);
    }

    if (countryId) {
        wheres.push(`s.country_id = ${countryId}`);
    }

    const sqlJoins = joins.join(' ');
    const sqlWheres = wheres.join(' AND ');

    const query = `SELECT s.* FROM vw_user_scores AS s ${sqlJoins} WHERE ${sqlWheres}`;
    const results = (await prisma.$queryRawUnsafe(query)) as UserScoreFromDB[];

    return results.map((s) => ({
        user_id: userId,
        country_id: Number(s.country_id),
        learning_type: learningType,
        succeeded: Number(s.succeeded),
        medium: Number(s.medium),
        failed: Number(s.failed)
    }));
}

export function getPlayableCountryId(scores: UserScore[]): number {
    scores.map(
        (s) => (s.score = calculateScore(s.succeeded, s.medium, s.failed))
    );

    scores.sort((a, b) => {
        if (a.score === undefined || b.score === undefined) {
            return 0;
        }
        return a.score - b.score;
    });
    const lowPartWeight = 0.8;
    const half = Math.ceil(scores.length / 2);
    const firstHalf = scores.slice(0, half);
    const secondHalf = scores.slice(half, scores.length);
    const random = Math.random();

    return random < lowPartWeight
        ? firstHalf[Math.floor(Math.random() * firstHalf.length)].country_id
        : secondHalf[Math.floor(Math.random() * secondHalf.length)].country_id;
}
