import { OkPacket, RowDataPacket } from 'mysql2';
import { database } from '../database';
import { User, UserScore } from '../types/user';
import {
    Lang,
    calculateScore,
    comparePasswords,
    fromScoreToLevel,
    getNewCountryToPlay,
    hashPassword
} from '../utils/common';
// import * as countryModel from './country.model';
export const create = async (user: User, callback: Function) => {
    const query =
        'INSERT INTO users (name, password, language, last_activity) VALUES (?, ?, ?, ?)';
    const hashedPassword = await hashPassword(user.password);
    user.password = hashedPassword;
    database.query(
        query,
        [user.name, user.password, user.language, user.last_activity],
        (err, result: OkPacket) => {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        }
    );
};

export const createScore = (
    user_id: number,
    user_name: string,
    country_code: string,
    callback: Function
) => {
    const queryCapitals =
        'INSERT INTO capital_scores (user_id, user_name, country_code) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_name = ?, country_code = ?, level = -1, succeeded = 0, failed = 0, medium = 0, succeeded_streak = 0, failed_streak = 0, medium_streak = 0';
    const queryFlags = queryCapitals.replace('capital', 'flag');
    database.query(
        queryCapitals,
        [user_id, user_name, country_code, user_name, country_code],
        (err, result: OkPacket) => {
            if (err) {
                callback(err);
            }
        }
    );
    database.query(
        queryFlags,
        [user_id, user_name, country_code, user_name, country_code],
        (err, result: OkPacket) => {
            if (err) {
                callback(err);
            }
        }
    );
    callback(null);
};

export const connect = async (
    name: string,
    password: string,
    last_activity: string,
    callback: Function
) => {
    const query = 'SELECT * FROM users WHERE name = ?';
    database.query(query, [name], async (err, result) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            for (let row of rows) {
                if (await comparePasswords(password, row.password)) {
                    updateActivity(row.id, last_activity, (err: any) => {
                        if (err) {
                            return callback(err);
                        }
                    });
                    const user: User = {
                        id: row.id,
                        name: row.name,
                        image: row.image,
                        password: row.password,
                        flag_level: row.flag_level,
                        capital_level: row.capital_level,
                        last_activity: last_activity,
                        created_at: row.created_at,
                        language: row.language
                    };
                    return callback(null, user);
                }
            }
            callback(null, null);
        }
    });
};

export const exists = (name: string, id: number | null, callback: Function) => {
    const query =
        id == null
            ? 'SELECT * FROM users WHERE name = ?'
            : 'SELECT * FROM users WHERE name = ? AND id != ?';
    database.query(query, [name, id], (err, result) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            if (rows.length > 0) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        }
    });
};

export const findNewCountry = (
    id: number,
    learning_type: string,
    lang: Lang,
    region: string,
    callback: Function
) => {
    let query =
        region === 'World'
            ? `SELECT * FROM ${learning_type}_scores WHERE user_id = ?`
            : `SELECT * FROM ${learning_type}_scores
            JOIN countries ON ${learning_type}_scores.country_code COLLATE utf8mb4_unicode_ci = countries.alpha3Code COLLATE utf8mb4_unicode_ci
            WHERE ${learning_type}_scores.user_id = ? AND countries.region = ?`;
    query += ' ORDER BY level ASC';
    database.query(query, [id, region], (err, result: RowDataPacket[]) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            const user_scores: UserScore[] = [];
            for (let row of rows) {
                const userScore: UserScore = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    country_code: row.country_code,
                    succeeded: row.succeeded,
                    medium: row.medium,
                    failed: row.failed,
                    succeeded_streak: row.succeeded_streak,
                    medium_streak: row.medium_streak,
                    failed_streak: row.failed_streak,
                    level: row.level
                };
                user_scores.push(userScore);
            }
            const newCountryCode = getNewCountryToPlay(user_scores);
            // countryModel.findByCode(
            //     newCountryCode,
            //     lang,
            //     (err: any, result: Country) => {
            //         if (err) {
            //             callback(err);
            //         } else {
            //             callback(null, result);
            //         }
            //     }
            // );
        }
    });
};

export const findOne = (id: number, callback: Function) => {
    const query = 'SELECT * FROM users WHERE id = ?';

    database.query(query, [id], (err, result: RowDataPacket[]) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            if (rows.length !== 1) {
                callback(null, null);
                return;
            }
            const user: User = {
                id: rows[0].id,
                name: rows[0].name,
                image: rows[0].image,
                password: rows[0].password,
                flag_level: rows[0].flag_level,
                capital_level: rows[0].capital_level,
                last_activity: rows[0].last_activity,
                created_at: rows[0].created_at,
                language: rows[0].language
            };
            callback(null, user);
        }
    });
};

export const findOneScore = (
    id: number,
    country_code: string,
    learning_type: string,
    callback: Function
) => {
    const query = `SELECT * FROM ${learning_type}_scores WHERE user_id = ? and country_code = ?`;

    database.query(
        query,
        [id, country_code],
        (err, result: RowDataPacket[]) => {
            if (err) {
                callback(err);
            } else {
                const rows = <RowDataPacket[]>result;
                if (rows.length !== 1) {
                    callback(null, null);
                    return;
                }
                const userScore: UserScore = {
                    user_id: rows[0].user_id,
                    user_name: rows[0].user_name,
                    country_code: rows[0].country_code,
                    succeeded: rows[0].succeeded,
                    succeeded_streak: rows[0].succeeded_streak,
                    medium: rows[0].medium,
                    medium_streak: rows[0].medium_streak,
                    failed: rows[0].failed,
                    failed_streak: rows[0].failed_streak,
                    level: rows[0].level
                };
                callback(null, userScore);
            }
        }
    );
};

export const findAllLevels = (
    id: number,
    sort: string,
    learning_type: string,
    callback: Function
) => {
    const query = `SELECT * FROM ${learning_type}_scores WHERE user_id = ? AND level > -1 ORDER BY level ${sort}`;
    database.query(query, [id, sort], (err, result: RowDataPacket[]) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            if (rows.length === 0) {
                callback(null, []);
                return;
            }
            let levels: UserScore[] = [];
            for (let row of rows) {
                let userScore: UserScore = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    country_code: row.country_code,
                    succeeded: row.succeeded,
                    succeeded_streak: row.succeeded_streak,
                    medium: row.medium,
                    medium_streak: row.medium_streak,
                    failed: row.failed,
                    failed_streak: row.failed_streak,
                    level: row.level
                };
                levels.push(userScore);
            }
            callback(null, levels);
        }
    });
};

export const update = (user: User, userId: number, callback: Function) => {
    const query =
        'UPDATE users SET name = ?, last_activity = ?, language = ?, flag_level = ?, capital_level = ? WHERE id = ?';

    database.query(
        query,
        [
            user.name,
            user.last_activity,
            user.language,
            user.flag_level,
            user.capital_level,
            userId
        ],
        (err, result) => {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        }
    );
};

export const updateActivity = (
    userId: number,
    activity: string,
    callback: Function
) => {
    const query = 'UPDATE users SET last_activity = ? WHERE id = ?';
    database.query(query, [activity, userId], (err, result) => {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
};

export const updateLevel = (
    userId: number,
    countryCode: string,
    learning_type: string
) => {
    const query = `UPDATE ${learning_type}_scores SET level = ? WHERE user_id = ? AND country_code = ?`;
    findOneScore(
        userId,
        countryCode,
        learning_type,
        (err: any, result: UserScore) => {
            if (result) {
                const level = fromScoreToLevel(
                    calculateScore(
                        result.succeeded,
                        result.medium,
                        result.failed
                    )
                );
                database.query(query, [level, userId, countryCode]);
            }
        }
    );
};

export const updateGlobalLevel = (userId: number, learning_type: string) => {
    const query = `UPDATE users SET ${learning_type}_level = ? WHERE id = ?`;
    findAllLevels(
        userId,
        'ASC',
        learning_type,
        (err: any, result: UserScore[]) => {
            if (result) {
                let sum = 0;
                let counter = 0;
                for (let user_score of result) {
                    if (user_score.level != -1) {
                        sum += user_score.level;
                        counter++;
                    }
                }
                let avg = sum / counter;
                if (Number.isNaN(avg)) {
                    avg = 0;
                }
                database.query(query, [avg, userId]);
            }
        }
    );
};

export const updateSucceededScore = (
    userId: number,
    countryCode: string,
    learning_type: string,
    score: string,
    callback: Function
) => {
    let reset_score1: string;
    let reset_score2: string;

    switch (score) {
        case 'succeeded':
            reset_score1 = 'medium';
            reset_score2 = 'failed';
            break;
        case 'medium':
            reset_score1 = 'succeeded';
            reset_score2 = 'failed';
            break;
        default:
            reset_score1 = 'succeeded';
            reset_score2 = 'medium';
    }

    const query = `UPDATE ${learning_type}_scores 
                   SET ${score} = ${score} + 1, 
                       ${score}_streak = ${score}_streak + 1, 
                       ${reset_score1}_streak = 0, 
                       ${reset_score2}_streak = 0 
                   WHERE user_id = ? AND country_code = ?`;

    database.query(query, [userId, countryCode], (err, result: OkPacket) => {
        if (err) {
            callback(err);
        } else {
            updateLevel(userId, countryCode, learning_type);
            updateGlobalLevel(userId, learning_type);
            callback(null, result);
        }
    });
};

export const remove = (id: number, callback: Function) => {
    const query = 'DELETE FROM users WHERE id = ?';
    database.query(query, [id], (err, result: OkPacket) => {
        if (err) {
            callback(err);
        } else {
            callback(null, result);
        }
    });
};

export const count = (callback: Function) => {
    const query = 'SELECT COUNT(*) AS count FROM users';
    database.query(query, (err, result: RowDataPacket[]) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            const count = rows[0].count;
            callback(null, count);
        }
    });
};
