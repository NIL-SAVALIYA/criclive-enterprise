import http from "http";
import app from "../app.js";

async function runApiVerificationTests() {
  console.log("🧪 Starting Automated API Verification Suite...");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const endpointsToTest = [
    { name: "Health Check", url: `${baseUrl}/api/health`, expectedStatus: 200 },
    { name: "Orange & Purple Caps", url: `${baseUrl}/api/v1/records/caps-and-leaders`, expectedStatus: 200 },
    { name: "MVP Leaderboard", url: `${baseUrl}/api/v1/records/mvp-leaderboard`, expectedStatus: 200 },
    { name: "Notifications Feed", url: `${baseUrl}/api/v1/notifications`, expectedStatus: 200 },
    { name: "Match Analytics", url: `${baseUrl}/api/v1/matches/dummy-id/analytics`, expectedStatus: 200 },
    { name: "Player Career Records", url: `${baseUrl}/api/v1/players/dummy-id/career-records`, expectedStatus: 200 },
    { name: "Protected Tournaments (Unauthenticated Check)", url: `${baseUrl}/api/v1/tournaments`, expectedStatus: 401 },
    { name: "Protected Teams (Unauthenticated Check)", url: `${baseUrl}/api/v1/teams`, expectedStatus: 401 },
    { name: "Swagger Docs UI", url: `${baseUrl}/api-docs/`, expectedStatus: 200 }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of endpointsToTest) {
    try {
      const response = await fetch(t.url);
      if (response.status === t.expectedStatus) {
        console.log(`✅ [PASS] ${t.name} -> Status ${response.status}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${t.name} -> Got ${response.status}, expected ${t.expectedStatus}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${t.name} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Verification Summary: ${passed} Passed, ${failed} Failed out of ${endpointsToTest.length} tests.`);
  server.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runApiVerificationTests();
