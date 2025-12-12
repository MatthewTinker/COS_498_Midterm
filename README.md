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
- Passwords (UPDATE WHEN WORKING ON THIS FEATURE)

### IN PROGRESS
- Database

### TO DO
- Account system, with customization
- Secure passwords using Hashing
- Password recovery
- Lockout system
- Real-time chat
- Comment Pagination
- Additional Feature (upvote/downvote system?)


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