import { OkPacket, RowDataPacket } from 'mysql2';
import { database } from '../database';
import { User, UserScore } from '../types/user';
import { comparePasswords, hashPassword } from '../utils/common';
export const create = async (user: User, callback: Function) => {
    console.log(user.created_at);
    const query =
        'INSERT INTO users (name, password, last_activity) VALUES (?, ?, ?)';
    const hashedPassword = await hashPassword(user.name, user.password);
    user.password = hashedPassword;
    database.query(
        query,
        [user.name, user.password, user.last_activity],
        (err, result: OkPacket) => {
            if (err) {
                callback(err);
            } else {
                const id = result.insertId;
                callback(null, id);
            }
        }
    );
};

export const createScore = (
    userScore: UserScore,
    userId: number,
    countryCode: string,
    callback: Function
) => {
    const query =
        'INSERT INTO user_scores (user_id, country_code, succeeded, succeeded_streak, medium, medium_streak, failed, failed_streak, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    database.query(
        query,
        [
            userId,
            countryCode,
            userScore.succeeded,
            userScore.succeeded_streak,
            userScore.medium,
            userScore.medium_streak,
            userScore.failed,
            userScore.failed_streak,
            userScore.level
        ],
        (err, result: OkPacket) => {
            if (err) {
                callback(err);
            } else {
                const id = result.insertId;
                callback(null, id);
            }
        }
    );
};

export const resetStreaks = (userId: number, callback: Function) => {
    const query =
        'UPDATE user_scores SET succeeded_streak = 0, medium_streak = 0, failed_streak = 0 WHERE user_id = ?';

    database.query(query, [userId], (err, result: OkPacket) => {
        if (err) {
            callback(err);
        } else {
            callback(null, result);
        }
    });
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
                if (await comparePasswords(name, password, row.password)) {
                    updateActivity(last_activity, row.id);
                    const user: User = {
                        id: row.id,
                        name: row.name,
                        password: row.password,
                        level: row.level,
                        last_activity: last_activity,
                        created_at: row.created_at
                    };
                    return callback(null, user);
                }
            }
            callback(null, null);
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
                password: rows[0].password,
                level: rows[0].level,
                last_activity: rows[0].last_activity,
                created_at: rows[0].created_at
            };
            callback(null, user);
        }
    });
};

export const findOneScore = (
    id: number,
    country_id: string,
    callback: Function
) => {
    const query =
        'SELECT * FROM user_scores WHERE user_id = ? and country_id = ?';

    database.query(query, [id, country_id], (err, result: RowDataPacket[]) => {
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
                alpha3Code: rows[0].alpha3Code,
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
    });
};

export const findAllLevels = (id: number, callback: Function) => {
    const query = 'SELECT level FROM userScores WHERE user_id = ?';

    database.query(query, [id], (err, result: RowDataPacket[]) => {
        if (err) {
            callback(err);
        } else {
            const rows = <RowDataPacket[]>result;
            if (rows.length === 0) {
                callback(null, 0);
                return;
            }
            let levels: number[] = [];
            for (let row of rows) {
                levels.push(row.level);
            }
            callback(null, levels);
        }
    });
};

export const update = (user: User, userId: number, callback: Function) => {
    const query =
        'UPDATE users SET name = ?, password = ?, level = ?, last_activity = ? WHERE id = ?';

    database.query(
        query,
        [user.name, user.password, user.level, user.last_activity, userId],
        (err, result) => {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        }
    );
};

const updateActivity = (activity: string, userId: number) => {
    const query = 'UPDATE users SET last_activity = ? WHERE id = ?';
    database.query(query, [activity, userId], (err, result) => {
        if (err) {
            console.log(err);
        }
    });
};

export const updateScore = (
    userScore: UserScore,
    userId: number,
    countryCode: string,
    callback: Function
) => {
    const query =
        'UPDATE userScores SET ? WHERE user_id = ? and country_code = ?';

    database.query(query, [userScore, userId, countryCode], (err, result) => {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
};

export const remove = (id: number, callback: Function) => {
    const query = 'DELETE FROM users WHERE id = ?';
    database.query(query, [id], (err, result) => {
        if (err) {
            callback(err);
        } else {
            callback(null);
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
