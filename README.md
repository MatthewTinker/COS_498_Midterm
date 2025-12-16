# Jeff the Landshark Discussion Forum
    
**COS 498 Serverside Web Dev - Final Project**

Web forum dedicated to the discussion of everyone's favorite landshark.


## Overview
This is a website source code designed to be used as a simple forum for discussion about Marvel Character, Jeff the Landshark. It contains basic security features, and is deliberately more secure. Additonally, there is support for live chat, as well as profile/user customization. 


## Features
### Database Schema
Explanation

### Environment Variables
Explanation

### Security Features
- Secured using SSL certificates from let's encrypt
- Passwords secured using argon2, as well as having to meet a set of adjustable criteria. if passwords fail to meet this criteria, they will be given an error when creating their account.
- Accounts will become locked out if the user fails to enter the correct password after 5 attempts. Lockout time is 15 minutes.

### Database
- CREATE TABLE users (
        username TEXT UNIQUE NOT NULL PRIMARY KEY,
        pass TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        profile_customization TEXT,
        account_lock INTEGER NOT NULL
    )
- CREATE TABLE login (
        login_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        IP TEXT NOT NULL,
        time_stamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        lock_status INTEGER NOT NULL,
        FOREIGN KEY (username) REFERENCES users(username)
    )
- CREATE TABLE comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        body TEXT NOT NULL,
        timestamps DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author) REFERENCES users(username)
    )
- CREATE TABLE sessions (
        session_id INTEGER NOT NULL PRIMARY KEY,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
    )


### IN PROGRESS
- Account system, with customization

### TO DO
- Comment Pagination
- Real-time chat
- Additional Feature (upvote/downvote system?)
- Password recovery


## Instructions

### Github
- Clone the repository to your server of choice
- Run the following: docker compose build 
- Then run: docker compose up -d

### NGINX Proxy Server
- Connect to the ip of the server and open the nginx proxy admin panel
- Set up the server as you wish: if you wish to use ssl certificates, set that up. Same with domain names. If you do choose to use one, ensure you have configured the domain name to actually use the server (adding it to the list of nameservers)
- When you are ready to close it, run docker compose down

Note: I recommend running this server on an Ubuntu server as this is what it was originally tested on. You don't strictly have to, but it is advised.