import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying Phase B Database Foundation...\n");

  // 1. Verify Sports Table
  const sports = await prisma.sport.findMany();
  console.log(`Sports count: ${sports.length}`);
  sports.forEach((s) => console.log(`  - [${s.code}] ${s.name} (id: ${s.id})`));

  const cricket = sports.find((s) => s.code === "CRICKET");
  const badminton = sports.find((s) => s.code === "BADMINTON");

  if (!cricket || !badminton) {
    throw new Error("❌ CRICKET or BADMINTON sport record missing!");
  }

  // 2. Verify Tournaments
  const tournaments = await prisma.tournament.findMany({ include: { sport: true } });
  console.log(`\nTournaments count: ${tournaments.length}`);
  tournaments.forEach((t) =>
    console.log(`  - Tournament '${t.name}' -> Sport: ${t.sport?.name || "NONE"}`)
  );

  // 3. Verify Teams
  const teams = await prisma.team.findMany({ include: { sport: true } });
  console.log(`\nTeams count: ${teams.length}`);
  teams.forEach((tm) =>
    console.log(`  - Team '${tm.name}' (${tm.shortName}) -> Sport: ${tm.sport?.name || "NONE"}`)
  );

  // 4. Verify Players
  const players = await prisma.player.findMany({ include: { sport: true } });
  console.log(`\nPlayers count: ${players.length}`);

  // 5. Verify Matches & Innings (Cricket data intact)
  const matches = await prisma.match.findMany({ include: { innings: true } });
  console.log(`\nMatches count: ${matches.length}`);

  console.log("\n============================================");
  console.log("✅ PHASE B DATABASE VERIFICATION SUCCESSFUL");
  console.log("============================================");
}

main()
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
