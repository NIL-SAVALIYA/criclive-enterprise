import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Cricket League Management System API",
    version: "1.0.0",
    description: "Enterprise Production REST APIs for Cricket Tournament & Match Management",
    contact: {
      name: "API Support",
      email: "support@cricketleague.com"
    }
  },
  servers: [
    {
      url: "https://criclive-enterprise-api.onrender.com",
      description: "Local Development Server"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error description message." }
        }
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully." },
          data: { type: "object" }
        }
      }
    }
  },
  tags: [
    { name: "System Health", description: "Health & diagnostic APIs" },
    { name: "Authentication", description: "User registration & login APIs" },
    { name: "Users", description: "User account management APIs" },
    { name: "Roles", description: "RBAC role management APIs" },
    { name: "Tournaments", description: "Tournament management APIs" },
    { name: "Tournament Teams", description: "Team registration to tournaments" },
    { name: "Teams", description: "Franchise team management APIs" },
    { name: "Players", description: "Player roster & career statistics APIs" },
    { name: "Fixtures & Matches", description: "Match scheduling & round-robin generator APIs" },
    { name: "Scoring & Match Operations", description: "Ball-by-ball scoring console & match lifecycle APIs" },
    { name: "Live Match Center", description: "Real-time live scores, commentary & scorecards" },
    { name: "Analytics & Leaderboards", description: "Wagon wheel, pitch map, Orange/Purple caps & standings" },
    { name: "Notifications", description: "System notification broadcast APIs" }
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["System Health"],
        summary: "Check system health and database connectivity",
        responses: {
          200: {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "OK" },
                    timestamp: { type: "string", example: "2026-08-04T20:00:00.000Z" }
                  }
                }
              }
            }
          }
        }
      }
    },

    // --- AUTHENTICATION ---
    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "firstName", "lastName"],
                properties: {
                  email: { type: "string", example: "admin@cricket.com" },
                  password: { type: "string", example: "SecurePass123!" },
                  firstName: { type: "string", example: "Nil" },
                  lastName: { type: "string", example: "Savaliya" },
                  role: { type: "string", example: "ADMIN" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User registered successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
          400: { description: "Invalid input or email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login (returns JWT Token)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@cricket.com" },
                  password: { type: "string", example: "SecurePass123!" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // --- USERS ---
    "/api/v1/users": {
      get: {
        tags: ["Users"],
        summary: "Get list of all users",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of users", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } } }
      }
    },
    "/api/v1/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User details" }, 404: { description: "User not found" } }
      },
      put: {
        tags: ["Users"],
        summary: "Update user by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User updated" } }
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User deleted" } }
      }
    },

    // --- ROLES ---
    "/api/v1/roles": {
      post: {
        tags: ["Roles"],
        summary: "Create RBAC role",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Role created" } }
      },
      get: {
        tags: ["Roles"],
        summary: "List all roles",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of roles" } }
      }
    },

    // --- TOURNAMENTS ---
    "/api/v1/tournaments": {
      get: {
        tags: ["Tournaments"],
        summary: "Get all tournaments",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of tournaments" } }
      },
      post: {
        tags: ["Tournaments"],
        summary: "Create a new tournament (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "format", "startDate", "endDate"],
                properties: {
                  name: { type: "string", example: "IPL Premier League 2026" },
                  description: { type: "string", example: "Official franchise cricket league" },
                  format: { type: "string", enum: ["LEAGUE", "KNOCKOUT", "ROUND_ROBIN", "HYBRID"], example: "LEAGUE" },
                  startDate: { type: "string", format: "date-time", example: "2026-08-01T10:00:00Z" },
                  endDate: { type: "string", format: "date-time", example: "2026-08-31T18:00:00Z" },
                  status: { type: "string", enum: ["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"], example: "UPCOMING" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Tournament created" }, 400: { description: "Validation error" } }
      }
    },
    "/api/v1/tournaments/{id}": {
      get: {
        tags: ["Tournaments"],
        summary: "Get tournament by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament details" } }
      },
      put: {
        tags: ["Tournaments"],
        summary: "Update tournament by ID (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament updated" } }
      },
      delete: {
        tags: ["Tournaments"],
        summary: "Delete tournament by ID (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament deleted" } }
      }
    },

    // --- TOURNAMENT TEAMS ---
    "/api/v1/tournament-teams/register": {
      post: {
        tags: ["Tournament Teams"],
        summary: "Register team to tournament",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Team registered to tournament" } }
      }
    },
    "/api/v1/tournament-teams/remove": {
      delete: {
        tags: ["Tournament Teams"],
        summary: "Remove team from tournament",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Team removed from tournament" } }
      }
    },
    "/api/v1/tournament-teams/{tournamentId}": {
      get: {
        tags: ["Tournament Teams"],
        summary: "Get registered teams for tournament",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "tournamentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Registered teams list" } }
      }
    },

    // --- TEAMS ---
    "/api/v1/teams": {
      get: {
        tags: ["Teams"],
        summary: "Get all teams",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of teams" } }
      },
      post: {
        tags: ["Teams"],
        summary: "Create team (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "shortName", "city"],
                properties: {
                  name: { type: "string", example: "Royal Challengers" },
                  shortName: { type: "string", example: "RCB" },
                  city: { type: "string", example: "Bengaluru" },
                  description: { type: "string", example: "Franchise cricket team" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Team created" } }
      }
    },
    "/api/v1/teams/{id}": {
      get: {
        tags: ["Teams"],
        summary: "Get team by ID with squad roster",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Team details with players" } }
      },
      put: {
        tags: ["Teams"],
        summary: "Update team (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Team updated" } }
      },
      delete: {
        tags: ["Teams"],
        summary: "Delete team (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Team deleted" } }
      }
    },

    // --- PLAYERS ---
    "/api/v1/players": {
      get: {
        tags: ["Players"],
        summary: "Get all players",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of players" } }
      },
      post: {
        tags: ["Players"],
        summary: "Create player (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "playerType", "teamId"],
                properties: {
                  firstName: { type: "string", example: "Virat" },
                  lastName: { type: "string", example: "Kohli" },
                  jerseyNumber: { type: "integer", example: 18 },
                  playerType: { type: "string", enum: ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"], example: "BATSMAN" },
                  battingStyle: { type: "string", example: "RIGHT_HAND" },
                  bowlingStyle: { type: "string", example: "RIGHT_ARM_MEDIUM" },
                  isCaptain: { type: "boolean", example: true },
                  isViceCaptain: { type: "boolean", example: false },
                  teamId: { type: "string", example: "uuid-team-id" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Player created" } }
      }
    },
    "/api/v1/players/{id}": {
      get: {
        tags: ["Players"],
        summary: "Get player details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Player details" } }
      },
      put: {
        tags: ["Players"],
        summary: "Update player by ID (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Player updated" } }
      },
      delete: {
        tags: ["Players"],
        summary: "Delete player by ID (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Player deleted" } }
      }
    },
    "/api/v1/players/{playerId}/statistics": {
      get: {
        tags: ["Players"],
        summary: "Get player batting and bowling statistics",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "playerId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Player statistics data" } }
      }
    },
    "/api/v1/players/{playerId}/career-records": {
      get: {
        tags: ["Players"],
        summary: "Get player format-wise career milestones and records",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "playerId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Player career records data" } }
      }
    },

    // --- FIXTURES & MATCHES ---
    "/api/v1/fixtures/generate/{tournamentId}": {
      post: {
        tags: ["Fixtures & Matches"],
        summary: "Auto-generate round-robin league schedule for tournament (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "tournamentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "League fixtures generated" } }
      }
    },
    "/api/v1/matches": {
      get: {
        tags: ["Fixtures & Matches"],
        summary: "Get all matches",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of matches" } }
      },
      post: {
        tags: ["Fixtures & Matches"],
        summary: "Create match fixture (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tournamentId", "teamAId", "teamBId", "venue", "matchDate"],
                properties: {
                  tournamentId: { type: "string", example: "uuid-tournament-id" },
                  teamAId: { type: "string", example: "uuid-team-a" },
                  teamBId: { type: "string", example: "uuid-team-b" },
                  venue: { type: "string", example: "National Cricket Stadium" },
                  matchDate: { type: "string", format: "date-time", example: "2026-08-10T14:30:00Z" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Match fixture created" } }
      }
    },
    "/api/v1/matches/{id}": {
      get: {
        tags: ["Fixtures & Matches"],
        summary: "Get match details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Match details" } }
      },
      put: {
        tags: ["Fixtures & Matches"],
        summary: "Update match details (ADMIN, ORGANIZER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Match updated" } }
      },
      delete: {
        tags: ["Fixtures & Matches"],
        summary: "Delete match fixture (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Match deleted" } }
      }
    },

    // --- SCORING & MATCH OPERATIONS ---
    "/api/v1/playing-xi": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "Submit playing XI for match (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Playing XI recorded" } }
      }
    },
    "/api/v1/playing-xi/{matchId}": {
      get: {
        tags: ["Scoring & Match Operations"],
        summary: "Get playing XI for match",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Playing XI list" } }
      }
    },
    "/api/v1/toss": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "Record match toss result (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Toss result recorded" } }
      }
    },
    "/api/v1/start-match": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "Start match lifecycle (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Match started" } }
      }
    },
    "/api/v1/innings/start": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "Start new innings (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Innings started" } }
      }
    },
    "/api/v1/balls": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "Submit ball delivery event with runs, extras, and wagon wheel coordinates (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["matchId", "inningsId", "bowlerId", "batsmanId", "runs"],
                properties: {
                  matchId: { type: "string", example: "uuid-match-id" },
                  inningsId: { type: "string", example: "uuid-innings-id" },
                  bowlerId: { type: "string", example: "uuid-bowler-id" },
                  batsmanId: { type: "string", example: "uuid-batsman-id" },
                  runs: { type: "integer", example: 4 },
                  isWicket: { type: "boolean", example: false },
                  extraType: { type: "string", enum: ["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE"], example: "NONE" },
                  shotZone: { type: "string", example: "MID_WICKET" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Ball delivery logged & live event broadcasted" } }
      }
    },
    "/api/v1/end-innings": {
      post: {
        tags: ["Scoring & Match Operations"],
        summary: "End innings (ADMIN, SCORER)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Innings ended" } }
      }
    },

    // --- LIVE MATCH CENTER ---
    "/api/v1/matches/{matchId}/live": {
      get: {
        tags: ["Live Match Center"],
        summary: "Get real-time live match state, current score, batters, bowler, and partnership",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Live match data" } }
      }
    },
    "/api/v1/matches/{matchId}/scorecard": {
      get: {
        tags: ["Live Match Center"],
        summary: "Get full match scorecard",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Full scorecard data" } }
      }
    },
    "/api/v1/live-score/{matchId}": {
      get: {
        tags: ["Live Match Center"],
        summary: "Get live score summary",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Live score summary" } }
      }
    },
    "/api/v1/commentary/{matchId}/commentary": {
      get: {
        tags: ["Live Match Center"],
        summary: "Get ball-by-ball live commentary feed",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Commentary list" } }
      }
    },
    "/api/v1/summary/{matchId}/summary": {
      get: {
        tags: ["Live Match Center"],
        summary: "Get match summary",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Match summary data" } }
      }
    },

    // --- ANALYTICS & LEADERBOARDS ---
    "/api/v1/matches/{matchId}/analytics": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get match analytics including Wagon Wheel, Pitch Map, and Worm Graph",
        parameters: [{ name: "matchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Match analytics data" } }
      }
    },
    "/api/v1/records/caps-and-leaders": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get Orange Cap (Most Runs) and Purple Cap (Most Wickets) leaders",
        responses: { 200: { description: "Caps and leaders data" } }
      }
    },
    "/api/v1/records/mvp-leaderboard": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get Most Valuable Player (MVP) leaderboard",
        responses: { 200: { description: "MVP leaderboard data" } }
      }
    },
    "/api/v1/records/head-to-head/{teamAId}/{teamBId}": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get head-to-head match history between two teams",
        parameters: [
          { name: "teamAId", in: "path", required: true, schema: { type: "string" } },
          { name: "teamBId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: { 200: { description: "Head-to-head analytics" } }
      }
    },
    "/api/v1/records/team-form/{teamId}": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get recent match performance form for team",
        parameters: [{ name: "teamId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Team form data" } }
      }
    },
    "/api/v1/points-table/{tournamentId}": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get tournament points table and Net Run Rate (NRR) standings",
        parameters: [{ name: "tournamentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Points table data" } }
      }
    },
    "/api/v1/tournaments/{tournamentId}/statistics": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get tournament leader statistics",
        parameters: [{ name: "tournamentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament statistics" } }
      }
    },
    "/api/v1/dashboard/stats": {
      get: {
        tags: ["Analytics & Leaderboards"],
        summary: "Get enterprise admin dashboard metrics summary",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Dashboard summary stats" } }
      }
    },

    // --- NOTIFICATIONS ---
    "/api/v1/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get list of broadcast system notifications",
        responses: { 200: { description: "List of notifications" } }
      },
      post: {
        tags: ["Notifications"],
        summary: "Publish a new system notification broadcast",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "message"],
                properties: {
                  title: { type: "string", example: "Tournament Announcement" },
                  message: { type: "string", example: "Final match scheduled for 8 PM." },
                  type: { type: "string", example: "SYSTEM" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Notification broadcasted" } }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
