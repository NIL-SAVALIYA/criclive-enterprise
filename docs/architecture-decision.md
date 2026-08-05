# Cricket League Management System

## Architecture Decisions
---

## Decision #1 - User & Role Relationship

### Decision
One User can have only one Role.

One Role can have many Users.

### Reason

- Simpler authentication.
- Easier authorization.
- Easy to understand.
- Easy to maintain.
- Can be extended later.

### Future

If multiple roles are required, a UserRole mapping table can be introduced.

---

## Decision #2 - Tournament Ownership

### Decision

The logged-in Organizer automatically becomes the Organizer of the Tournament they create.

Two fields will be stored:

- organizerId
- createdBy

### Reason

Simple workflow.

Supports auditing.

Allows future expansion.

---

## Decision #3 - Soft Delete

### Decision

Important records will never be permanently deleted.

Instead, they will be marked using:

- isActive
- status

### Reason

Preserves history.

Maintains reports and statistics.

Supports auditing.

---

## Decision #4 - Venue

### Decision

Venue will be a separate entity.

Matches will reference Venue.

### Reason

One Venue can host many Matches.

One Tournament can have multiple Venues.

Supports Stadiums, School Grounds, Local Grounds and Corporate Grounds.

---

## Decision #5 - Team Logo

### Decision

Images will not be stored in PostgreSQL.

Database stores only:

- logoUrl

Actual image will be stored in cloud/local storage.

### Reason

Better performance.

Smaller database.

Easy migration.

Supports Cloudinary/S3 in future.

---

## Decision #6 - Captain

### Decision

Captain and Vice Captain are Players.

They are not stored as names.

Relationships will be used instead.

### Reason

Avoids duplicate data.

Supports captain changes.

Keeps database normalized.


---------------------------------next session :----------------------


Decision #7----------

Store IDs, not names, when referencing another entity.

Reason:

Prevent duplicate data.
Support updates without changing multiple records.


Decision #8:------

Use junction tables for many-to-many relationships.

Example:

Tournament ↔ Team
(Future) Tournament ↔ Venue if needed.

Reason:

Scalable.
Supports reuse.
Easier to extend.


Decision #9:-------------------

Approval belongs to the relationship, not the entity.

Example:

A team is approved for a tournament, not globally.


-----------------------OUR DATABASE DESIGN :--------------


Role

↓

User

↓

Tournament

↓

TournamentTeam

↓

Team

↓

Player

↓

Venue

↓

Match

↓

Scorecard

↓

Statistics

↓

Notification


13-7-26


## Decision #10 - Primary Key Strategy

### Decision
Use UUID as the primary key for all major entities.

### Reason
- Better security
- Industry standard
- Suitable for distributed systems
- Prevents predictable IDs in APIs

### Example

550e8400-e29b-41d4-a716-446655440000


---------


First Understand the Backend Flow:-------------------

------------ Every request follows this path:----


                Client (Bruno / React)

                        │
                 GET /api/health
                        │
                        ▼
                  Express Server
                        │
                        ▼
                     Routes
                        │
                        ▼
                  Controller
                        │
                        ▼
                    Service
                        │
                        ▼
                 Repository
                        │
                        ▼
                  Prisma Client
                        │
                        ▼
                  PostgreSQL


![alt text](image.png)



![alt text](image-1.png)

## Decision #11 - Module System

### Decision
Use ES Modules instead of CommonJS.

### Reason
- Modern JavaScript standard
- Cleaner import/export syntax
- Better ecosystem compatibility
- Recommended for new Node.js projects


## Decision #12 - Environment Configuration

### Decision

Store all configuration inside .env

### Reason

- Better security
- Easy deployment
- No hardcoded secrets
- Different environments can use different configurations


### 13 - Role Access Control

📅 Tomorrow's Plan (Module 3)

We'll build Role-Based Access Control (RBAC) professionally:

Authorization middleware
Restrict routes based on roles
Only ADMIN can:
Create Role
Update Role
Delete Role
Test all scenarios in Bruno
Push the RBAC module to GitHub

If time permits, we'll also start User Management APIs.


### 14-- npx prisma studio 

- for all table checking 


### 15 - structure of crud
- Model  -tournament model in schema.prisma
  
   ↓
Validator -tournament.validator.js
   ↓
Repository -tournament.repository.js
   ↓
Service    - same for service
   ↓
Controller -same
   ↓
Routes    -same
   ↓
Testing


21-07-26

Absolutely. Based on everything we've fixed over the last few sessions, I would stop modifying the ball engine now. It's stable enough to move to the next module.

                  Current Progress
                  ✅ Completed
                  Authentication
                  User
                  Roles
                  JWT
                  Tournament
                  Tournament
                  Teams
                  Players
                  Fixtures
                  Matches
                  Scoring Engine
                  Ball API
                  Batting Scorecard
                  Bowling Scorecard
                  Partnership
                  Extras
                  Strike Rotation
                  Over Progression
                  Maiden Overs
                  Fall of Wicket
                  Live Score

This is the heart of the system, and it's in good shape.

Next Phase

I recommend building the Match Management Layer before the frontend.

**Module 1: Match State API ⭐ (Highest Priority)**

Create APIs like:

GET /matches/:id/live

Response:

{
  "match": {},
  "innings": {},
  "currentBatters": {},
  "currentBowler": {},
  "lastBall": {},
  "currentOver": [],
  "scorecard": {},
  "partnership": {},
  "requiredRunRate": {},
  "recentOvers": []
}

This endpoint becomes the single source of truth for your frontend.

**Module 2: Scorecard API**

GET /matches/:id/scorecard

Should return

Batting Scorecard

Bowling Scorecard

Fall of Wickets

Partnerships

Extras

Run Rate

Exactly like Cricbuzz or ESPN Cricinfo.

**Module 3: Commentary API**

Since every ball already stores:

{
    "commentary": "Dot Ball"
}

Create

GET /matches/:id/commentary

Return

18.6 Dot Ball

18.5 FOUR

18.4 Single

18.3 OUT

18.2 Wide

18.1 Dot

Later you can add filters and pagination.


**Module 4: Wagon Wheel & Ball History**


GET /matches/:id/balls

Return every delivery.

Later this powers

Wagon Wheel
Manhattan Chart
Worm Chart
Over-by-over view

without changing the backend.


**Module 5: Match Summary**


GET /matches/:id/summary

Example

Team A

185/6 (20)

Team B

181/9 (20)

Winner

Team A by 4 runs

Player of Match

Best Batter

Best Bowler

Most Sixes

Highest Partnership
After Backend

Then we build the React frontend.

Suggested pages:

Login

Dashboard

Tournament

Teams

Players

Fixtures

Live Match

Scoring Screen

Commentary

Scorecard

Points Table

Statistics
Advanced Features (Unique Selling Points)

**These are features that make your project stand out:**


                     Live WebSocket score updates
                     Automatic points table updates
                     Net Run Rate calculation
                     Orange Cap
                     Purple Cap
                     MVP ranking
                     Win probability graph
                     Manhattan chart
                     Worm chart
                     Wagon wheel
                     Partnership graph
                     Ball-by-ball replay
                     AI-generated match summary
                     PDF scorecard export
                     CSV statistics export


**Recommended Order**


✅ Ball Engine (completed)
✅ Live Match API
✅ Scorecard API
✅ Commentary API
✅ Match Summary API
✅ Points Table
✅ Tournament Standings
✅ Statistics Engine
✅ React Frontend
✅ Real-time updates (Socket.IO)
✅ Admin Dashboard
✅ Deployment