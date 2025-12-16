//Stores the routes for creating a user session, the login page, and password validation/hashing

//This script is absolutely vital: 
//Keeps passwords secure and safe
//Forces users to create stronger passwords
//Locks accounts if the user fails to enter the correct password after multiple attempts (set to 5 by default, this is adjustable)


const express = require('express');
const router = express.Router();
const { validatePassword, hashPassword, comparePassword } = require('../modules/password-utils');

// Configuration constants
// sed for account lockouts
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;


// Helper function for logging (you'll need to pass db to this router)
function logLoginAttempt(db, username, ip, lockStatus, callback) {
    db.run(
        'INSERT INTO login (username, IP, lock_status) VALUES (?, ?, ?)',
        [username, ip, lockStatus],
        callback
    );
}

// Helper function for creating sessions
function createSession(db, username, callback) {
    db.get('SELECT MAX(session_id) as maxId FROM sessions', [], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        
        const sessionId = (row.maxId || 0) + 1;

        db.run(
            'INSERT INTO sessions (session_id, username) VALUES (?, ?)',
            [sessionId, username],
            (err) => {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, sessionId.toString());
                }
            }
        );
    });
}

//Main function used to lock accounts
//Checks the database to track how many attempts to login have been made
//if the number == the max, locks account for 15 minutes

function checkAccountLockout(db, username, callback) {
    const lockoutTimeMinutes = LOCKOUT_DURATION_MINUTES;
    const maxAttempts = MAX_LOGIN_ATTEMPTS;

    db.all(
        `SELECT COUNT(*) as failCount, MIN(time_stamp) as firstAttempt, MAX(time_stamp) as lastAttempt 
         FROM login 
         WHERE username = ? 
         AND lock_status = 1 
         AND time_stamp > datetime('now', '-${lockoutTimeMinutes} minutes')`,
        [username],
        (err, rows) => {
            if (err) {
                console.error('Database error in checkAccountLockout:', err);
                return callback(err, null);
            }
            
            console.log('Raw query results:', rows);
            
            const failCount = rows[0].failCount;
            const firstAttempt = rows[0].firstAttempt;  // Changed from lastAttempt
            const lastAttempt = rows[0].lastAttempt;
            
            console.log(`Failed attempts in last ${lockoutTimeMinutes} mins: ${failCount}`);
            console.log(`First attempt time: ${firstAttempt}`);
            console.log(`Last attempt time: ${lastAttempt}`);
            
            if (failCount >= maxAttempts) {
                // Use FIRST attempt time, not last
                const firstAttemptTime = new Date(firstAttempt);
                const lockoutEndTime = new Date(firstAttemptTime.getTime() + (lockoutTimeMinutes * 60000));
                const now = new Date();
                const remainingMinutes = Math.ceil((lockoutEndTime - now) / 60000);
                
                console.log('ACCOUNT IS LOCKED');
                console.log(`Lockout ends at: ${lockoutEndTime}`);
                console.log(`Remaining minutes: ${remainingMinutes}`);
                
                // If lockout has expired, return unlocked
                if (remainingMinutes <= 0) {
                    console.log('Lockout period has expired - unlocking account');
                    callback(null, {
                        isLocked: false,
                        failedAttempts: 0
                    });
                } else {
                    callback(null, {
                        isLocked: true,
                        remainingMinutes: remainingMinutes,
                        failedAttempts: failCount
                    });
                }
            } else {
                console.log('Account NOT locked yet');
                callback(null, {
                    isLocked: false,
                    failedAttempts: failCount
                });
            }
        }
    );
}

// Lock the account in the database
function lockAccount(db, username) {
    db.run(
        'UPDATE users SET account_lock = 1 WHERE username = ?',
        [username],
        (err) => {
            if (err) {
                console.error('Error locking account:', err);
            }
        }
    );
}

// Unlock the account in the database
function unlockAccount(db, username) {
    db.run(
        'UPDATE users SET account_lock = 0 WHERE username = ?',
        [username],
        (err) => {
            if (err) {
                console.error('Error unlocking account:', err);
            }
        }
    );
}

// Export a function that takes the db instance
const passwordUtils = require('../modules/password-utils');

module.exports = function(db) {

    
    // Register POST route
    router.post('/register', async (req, res) => {
        const { username, password, email, display_name } = req.body;

        // Validate email is provided
        if (!email) {
            return res.render('register', {
                error: "Email is required",
                year: new Date().getFullYear()
            });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('register', {
                error: "Please enter a valid email address",
                year: new Date().getFullYear()
            });
        }

        // Validate display name is provided and different from username
        if (!display_name) {
            return res.render('register', {
                error: "Display name is required",
                year: new Date().getFullYear()
            });
        }

        if (display_name.toLowerCase() === username.toLowerCase()) {
            return res.render('register', {
                error: "Display name must be different from username",
                year: new Date().getFullYear()
            });
        }

        // Validate password using the password-utils module
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.render('register', {
                error: passwordValidation.errors.join('. '),
                year: new Date().getFullYear()
            });
        }

        // Check if username already exists
        db.get('SELECT username FROM users WHERE username = ?', [username], async (err, userByUsername) => {
            if (err) {
                return res.render('register', {
                    error: "Database error occurred",
                    year: new Date().getFullYear()
                });
            }

            if (userByUsername) {
                return res.render('register', {
                    error: "Username already taken",
                    year: new Date().getFullYear()
                });
            }

            // Check if email already exists
            db.get('SELECT email FROM users WHERE email = ?', [email], async (err, userByEmail) => {
                if (err) {
                    return res.render('register', {
                        error: "Database error occurred",
                        year: new Date().getFullYear()
                    });
                }

                if (userByEmail) {
                    return res.render('register', {
                        error: "Email already in use",
                        year: new Date().getFullYear()
                    });
                }

                try {
                    // Hash password with Argon2 using the password-utils module
                    const hashedPassword = await hashPassword(password);

                    // Insert new user
                    db.run(
                        'INSERT INTO users (username, pass, email, display_name, account_lock) VALUES (?, ?, ?, ?, ?)',
                        [username, hashedPassword, email, display_name || username, 0],
                        function(err) {
                            if (err) {
                                return res.render('register', {
                                    error: "Error creating account",
                                    year: new Date().getFullYear()
                                });
                            }

                            // Log the registration
                            logLoginAttempt(db, username, req.ip, 0, () => {});

                            // Create session
                            createSession(db, username, (err, sessionId) => {
                                if (err) {
                                    return res.redirect('/login');
                                }

                                res.cookie('sessionId', sessionId);
                                res.redirect('/comments');
                            });
                        }
                    );
                } catch (hashError) {
                    console.error('Password hashing error:', hashError);
                    return res.render('register', {
                        error: "Error processing password",
                        year: new Date().getFullYear()
                    });
                }
            });
        });
    });

    // Login POST route with account lockout
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;

        // First check if account is locked due to failed attempts
        checkAccountLockout(db, username, (err, lockoutStatus) => {
            if (err) {
                console.error('Error checking lockout status:', err);
                return res.render('login', {
                    error: "Error processing login",
                    year: new Date().getFullYear()
                });
            }

            if (lockoutStatus.isLocked) {
                // Log the failed attempt (account is locked)
                logLoginAttempt(db, username, req.ip, 1, () => {});
                
                return res.render('login', {
                    error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockoutStatus.remainingMinutes} minute(s).`,
                    year: new Date().getFullYear()
                });
            }

            // Proceed with normal login
            db.get(
                'SELECT username, pass, account_lock FROM users WHERE username = ?',
                [username],
                async (err, user) => {
                    if (err || !user) {
                        // Log failed login attempt
                        if (username) {
                            logLoginAttempt(db, username, req.ip, 1, () => {});
                        }

                        return res.render('login', {
                            error: "Invalid username or password",
                            year: new Date().getFullYear()
                        });
                    }

                    try {
                        // Verify password using the password-utils module
                        const validPassword = await comparePassword(password, user.pass);
                        
                        if (!validPassword) {
                            // Log failed login attempt
                            logLoginAttempt(db, username, req.ip, 1, () => {});
                            
                            // Check if this failure triggers a lockout
                            checkAccountLockout(db, username, (err, newLockoutStatus) => {
                                if (!err && newLockoutStatus.isLocked) {
                                    // Lock the account
                                    lockAccount(db, username);
                                    
                                    return res.render('login', {
                                        error: `Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
                                        year: new Date().getFullYear()
                                    });
                                }
                                
                                const remainingAttempts = MAX_LOGIN_ATTEMPTS - newLockoutStatus.failedAttempts;
                                return res.render('login', {
                                    error: `Invalid username or password. ${remainingAttempts} attempt(s) remaining before account lockout.`,
                                    year: new Date().getFullYear()
                                });
                            });
                            return;
                        }

                        // Check if account is permanently locked (account_lock = 1 in users table)
                        if (user.account_lock === 1) {
                            return res.render('login', {
                                error: "Account is permanently locked. Please contact support.",
                                year: new Date().getFullYear()
                            });
                        }

                        // Successful login - log it
                        logLoginAttempt(db, username, req.ip, 0, () => {});

                        // Create session
                        createSession(db, username, (err, sessionId) => {
                            if (err) {
                                return res.render('login', {
                                    error: "Error creating session",
                                    year: new Date().getFullYear()
                                });
                            }

                            res.cookie('sessionId', sessionId);
                            res.redirect('/comments');
                        });
                    } catch (verifyError) {
                        console.error('Password verification error:', verifyError);
                        return res.render('login', {
                            error: "Error verifying password",
                            year: new Date().getFullYear()
                        });
                    }
                }
            );
        });
    });

    return router;
};