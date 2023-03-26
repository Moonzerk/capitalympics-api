import { OkPacket, RowDataPacket } from 'mysql2';
import { comparePasswords, hashPassword } from '../common';
import { database } from '../database';
import { User, UserScore } from '../types/user';
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

export const createScore = (userScore: UserScore, callback: Function) => {
    const query = 'INSERT INTO user_scores (user_id, country_id) VALUES (?, ?)';

    database.query(
        query,
        [userScore.user_id, userScore.country_code],
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
                country_code: rows[0].id,
                succeeded_streak: rows[0].succeeded_streak,
                failed_streak: rows[0].failed_streak,
                succeeded: rows[0].succeeded,
                failed: rows[0].failed,
                level: rows[0].level
            };
            callback(null, userScore);
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

export const updateScore = (userScore: UserScore, callback: Function) => {
    const query =
        'UPDATE userScores SET succeeded_streak = ?, failed_streak = ?, succeeded = ?, failed = ?, level = ? WHERE user_id = ? AND country_id = ?';

    database.query(
        query,
        [
            userScore.succeeded_streak,
            userScore.failed_streak,
            userScore.succeeded,
            userScore.failed,
            userScore.level,
            userScore.user_id,
            userScore.country_code
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
