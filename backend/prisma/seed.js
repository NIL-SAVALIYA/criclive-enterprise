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
    // Seed Sports
    // ==========================
    const cricketSport = await prisma.sport.upsert({
        where: { code: "CRICKET" },
        update: {},
        create: {
            code: "CRICKET",
            name: "Cricket",
            description: "Cricket platform sport",
            icon: "🏏",
            isActive: true
        }
    });

    const badmintonSport = await prisma.sport.upsert({
        where: { code: "BADMINTON" },
        update: {},
        create: {
            code: "BADMINTON",
            name: "Badminton",
            description: "Badminton platform sport",
            icon: "🏸",
            isActive: true
        }
    });

    const footballSport = await prisma.sport.upsert({
        where: { code: "FOOTBALL" },
        update: {},
        create: {
            code: "FOOTBALL",
            name: "Football",
            description: "Football platform sport",
            icon: "⚽",
            isActive: true
        }
    });

    console.log("✅ Sports seeded (CRICKET, BADMINTON, FOOTBALL).");

    // Associate unassigned tournaments, teams, and players with Cricket
    await prisma.tournament.updateMany({
        where: { sportId: null },
        data: { sportId: cricketSport.id }
    });

    await prisma.team.updateMany({
        where: { sportId: null },
        data: { sportId: cricketSport.id }
    });

    await prisma.player.updateMany({
        where: { sportId: null },
        data: { sportId: cricketSport.id }
    });

    console.log("✅ Existing records associated with Cricket.");

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

    const cricketTeams = await prisma.team.findMany({
        where: { shortName: { in: ["TS", "PW", "TB"] } }
    });

    for (const team of cricketTeams) {
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

    // ==========================
    // Seed Football Teams & Squads
    // ==========================
    const rma = await prisma.team.upsert({
        where: { name: "Real Madrid" },
        update: { sportId: footballSport.id },
        create: {
            name: "Real Madrid",
            shortName: "RMA",
            city: "Madrid",
            sportId: footballSport.id
        }
    });

    const bay = await prisma.team.upsert({
        where: { name: "Bayern Munich" },
        update: { sportId: footballSport.id },
        create: {
            name: "Bayern Munich",
            shortName: "BAY",
            city: "Munich",
            sportId: footballSport.id
        }
    });

    const rmaPlayers = [
        { firstName: "Thibaut", lastName: "Courtois", jerseyNumber: 1, playerType: "WICKET_KEEPER" },
        { firstName: "Andriy", lastName: "Lunin", jerseyNumber: 13, playerType: "WICKET_KEEPER" },
        { firstName: "Dani", lastName: "Carvajal", jerseyNumber: 2, playerType: "BOWLER" },
        { firstName: "Eder", lastName: "Militao", jerseyNumber: 3, playerType: "BOWLER" },
        { firstName: "David", lastName: "Alaba", jerseyNumber: 4, playerType: "BOWLER" },
        { firstName: "Antonio", lastName: "Rudiger", jerseyNumber: 22, playerType: "BOWLER" },
        { firstName: "Ferland", lastName: "Mendy", jerseyNumber: 23, playerType: "BOWLER" },
        { firstName: "Jude", lastName: "Bellingham", jerseyNumber: 5, playerType: "ALL_ROUNDER" },
        { firstName: "Eduardo", lastName: "Camavinga", jerseyNumber: 6, playerType: "ALL_ROUNDER" },
        { firstName: "Federico", lastName: "Valverde", jerseyNumber: 8, playerType: "ALL_ROUNDER" },
        { firstName: "Luka", lastName: "Modric", jerseyNumber: 10, playerType: "ALL_ROUNDER", isCaptain: true },
        { firstName: "Aurelien", lastName: "Tchouameni", jerseyNumber: 14, playerType: "ALL_ROUNDER" },
        { firstName: "Arda", lastName: "Guler", jerseyNumber: 15, playerType: "ALL_ROUNDER" },
        { firstName: "Vinicius", lastName: "Junior", jerseyNumber: 7, playerType: "BATSMAN", isViceCaptain: true },
        { firstName: "Kylian", lastName: "Mbappe", jerseyNumber: 9, playerType: "BATSMAN" },
        { firstName: "Rodrygo", lastName: "Goes", jerseyNumber: 11, playerType: "BATSMAN" }
    ];

    for (const p of rmaPlayers) {
        const existing = await prisma.player.findFirst({
            where: { teamId: rma.id, jerseyNumber: p.jerseyNumber }
        });
        if (!existing) {
            await prisma.player.create({
                data: {
                    ...p,
                    teamId: rma.id,
                    sportId: footballSport.id
                }
            });
        }
    }

    const bayPlayers = [
        { firstName: "Manuel", lastName: "Neuer", jerseyNumber: 1, playerType: "WICKET_KEEPER", isCaptain: true },
        { firstName: "Sven", lastName: "Ulreich", jerseyNumber: 26, playerType: "WICKET_KEEPER" },
        { firstName: "Dayot", lastName: "Upamecano", jerseyNumber: 2, playerType: "BOWLER" },
        { firstName: "Minjae", lastName: "Kim", jerseyNumber: 3, playerType: "BOWLER" },
        { firstName: "Joshua", lastName: "Kimmich", jerseyNumber: 6, playerType: "BOWLER", isViceCaptain: true },
        { firstName: "Alphonso", lastName: "Davies", jerseyNumber: 19, playerType: "BOWLER" },
        { firstName: "Raphael", lastName: "Guerreiro", jerseyNumber: 22, playerType: "BOWLER" },
        { firstName: "Leon", lastName: "Goretzka", jerseyNumber: 8, playerType: "ALL_ROUNDER" },
        { firstName: "Konrad", lastName: "Laimer", jerseyNumber: 27, playerType: "ALL_ROUNDER" },
        { firstName: "Jamal", lastName: "Musiala", jerseyNumber: 42, playerType: "ALL_ROUNDER" },
        { firstName: "Aleksandar", lastName: "Pavlovic", jerseyNumber: 45, playerType: "ALL_ROUNDER" },
        { firstName: "Serge", lastName: "Gnabry", jerseyNumber: 7, playerType: "BATSMAN" },
        { firstName: "Harry", lastName: "Kane", jerseyNumber: 9, playerType: "BATSMAN" },
        { firstName: "Leroy", lastName: "Sane", jerseyNumber: 10, playerType: "BATSMAN" },
        { firstName: "Michael", lastName: "Olise", jerseyNumber: 17, playerType: "BATSMAN" },
        { firstName: "Thomas", lastName: "Muller", jerseyNumber: 25, playerType: "BATSMAN" }
    ];

    for (const p of bayPlayers) {
        const existing = await prisma.player.findFirst({
            where: { teamId: bay.id, jerseyNumber: p.jerseyNumber }
        });
        if (!existing) {
            await prisma.player.create({
                data: {
                    ...p,
                    teamId: bay.id,
                    sportId: footballSport.id
                }
            });
        }
    }

    console.log("✅ Football Teams & Squads seeded.");

    // Seed Football Tournament & Match
    const fbTournament = await prisma.tournament.upsert({
        where: { name: "UEFA Champions League 2026" },
        update: { sportId: footballSport.id },
        create: {
            name: "UEFA Champions League 2026",
            description: "European Elite Football Club Tournament",
            format: "LEAGUE",
            startDate: new Date("2026-09-01"),
            endDate: new Date("2026-11-30"),
            status: "UPCOMING",
            sportId: footballSport.id
        }
    });

    await prisma.tournamentTeam.upsert({
        where: { tournamentId_teamId: { tournamentId: fbTournament.id, teamId: rma.id } },
        update: {},
        create: { tournamentId: fbTournament.id, teamId: rma.id }
    });
    await prisma.tournamentTeam.upsert({
        where: { tournamentId_teamId: { tournamentId: fbTournament.id, teamId: bay.id } },
        update: {},
        create: { tournamentId: fbTournament.id, teamId: bay.id }
    });

    const existingFbMatch = await prisma.match.findFirst({
        where: { tournamentId: fbTournament.id, teamAId: rma.id, teamBId: bay.id }
    });
    if (!existingFbMatch) {
        await prisma.match.create({
            data: {
                tournamentId: fbTournament.id,
                teamAId: rma.id,
                teamBId: bay.id,
                venue: "Santiago Bernabeu",
                matchDate: new Date("2026-09-15T20:00:00"),
                status: "UPCOMING"
            }
        });
    }

    console.log("✅ Football Tournament & Demo Fixture seeded.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


