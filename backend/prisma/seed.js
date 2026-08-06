import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

    // ==========================
    // Seed Roles
    // ==========================
    const roles = [
        {
            name: "ADMIN",
            description: "system administrator"
        },
        {
            name: "ORGANIZER",
            description: "Tournament Organizer"
        },
        {
            name: "TEAM_MANAGER",
            description: "Team Manager"
        },
        {
            name: "VIEWER",
            description: "Read only users"
        }
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: {
                name: role.name
            },
            update: {},
            create: role
        });
    }

    console.log("✅ Roles seeded.");

    // ==========================
    // Seed Teams
    // ==========================
    const teams = [
        {
            name: "Thunder Strikers",
            shortName: "TS",
            city: "Ahmedabad"
        },
        {
            name: "Phoenix Warriors",
            shortName: "PW",
            city: "Surat"
        },
        {
            name: "Titan Blasters",
            shortName: "TB",
            city: "Rajkot"
        }
    ];

    for (const team of teams) {
        await prisma.team.upsert({
            where: {
                name: team.name
            },
            update: {},
            create: team
        });
    }

    console.log("✅ Teams seeded.");

    // ==========================
    // Seed Tournament
    // ==========================
    await prisma.tournament.upsert({
        where: {
            name: "CRICLIVE Premier League 2026"
        },
        update: {},
        create: {
            name: "CRICLIVE Premier League 2026",
            description: "Official Enterprise Demo Tournament",
            format: "LEAGUE",
            startDate: new Date("2026-08-10"),
            endDate: new Date("2026-08-30"),
            status: "UPCOMING"
        }
    });

    console.log("✅ Tournament seeded.");
    // ==========================
    // Register Teams in Tournament
    // ==========================

    const tournamentRecord = await prisma.tournament.findFirst({
        where: {
            name: "CRICLIVE Premier League 2026"
        }
    });

    const allTeams = await prisma.team.findMany();

    for (const team of allTeams) {
        await prisma.tournamentTeam.upsert({
            where: {
                tournamentId_teamId: {
                    tournamentId: tournamentRecord.id,
                    teamId: team.id
                }
            },
            update: {},
            create: {
                tournamentId: tournamentRecord.id,
                teamId: team.id
            }
        });
    }

    console.log("✅ Teams registered in tournament.");

    // ==========================
    // Seed First Match
    // ==========================

    const thunderStrikers = await prisma.team.findFirst({
        where: {
            shortName: "TS"
        }
    });

    const phoenixWarriors = await prisma.team.findFirst({
        where: {
            shortName: "PW"
        }
    });

    await prisma.match.upsert({
        where: {
            id: "11111111-1111-1111-1111-111111111111"
        },
        update: {},
        create: {
            id: "11111111-1111-1111-1111-111111111111",

            tournamentId: tournamentRecord.id,

            teamAId: thunderStrikers.id,

            teamBId: phoenixWarriors.id,

            venue: "Narendra Modi Stadium",

            matchDate: new Date("2026-08-10T19:30:00"),

            status: "UPCOMING"
        }
    });

    console.log("✅ First match seeded.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


