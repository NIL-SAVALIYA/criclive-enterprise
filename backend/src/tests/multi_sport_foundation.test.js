import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

// Helper function to register and login an organizer for testing
async function getAuthenticatedOrganizerToken() {
  const email = `organizer_ms_${Date.now()}@criclive.com`;
  const password = "Password123!";

  // 1. Register viewer
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "MultiSport",
      lastName: "Organizer",
      email,
      password
    })
  });
  assert.equal(regRes.status, 201, "Registration should succeed");

  // 2. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaToken: "test_captcha_bypass_token"
    })
  });
  assert.equal(loginRes.status, 200, "Login should succeed");
  const loginData = await loginRes.json();
  const token = loginData.data.token;

  // 3. Upgrade to organizer
  const appRes = await fetch(`${BASE_URL}/organizer-applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      organizationName: `Sports Org ${Date.now()}`,
      city: "Mumbai"
    })
  });
  assert.equal(appRes.status, 201, "Organizer application should succeed");

  return token;
}

test("🏆 Multi-Sport Foundation & API Verification Suite", async (t) => {
  let organizerToken;

  await t.test("1. Setup authenticated organizer", async () => {
    organizerToken = await getAuthenticatedOrganizerToken();
    assert.ok(organizerToken, "Organizer token must be generated.");
  });

  await t.test("2. GET /api/v1/sports returns active sports list", async () => {
    const res = await fetch(`${BASE_URL}/sports`);
    assert.equal(res.status, 200, "GET /sports must return HTTP 200");
    const json = await res.json();
    assert.equal(json.success, true, "Response must indicate success");
    assert.ok(Array.isArray(json.data), "data must be an array");

    const cricket = json.data.find((s) => s.code === "CRICKET");
    const badminton = json.data.find((s) => s.code === "BADMINTON");

    assert.ok(cricket, "CRICKET sport must be present");
    assert.equal(cricket.name, "Cricket");
    assert.ok(badminton, "BADMINTON sport must be present");
    assert.equal(badminton.name, "Badminton");
  });

  await t.test("3. Create Tournament with invalid sport code is rejected (400)", async () => {
    const res = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: `Invalid Sport Tourney ${Date.now()}`,
        format: "LEAGUE",
        startDate: "2026-09-01T10:00:00Z",
        endDate: "2026-09-10T10:00:00Z",
        sport: "FOOTBALL"
      })
    });

    assert.equal(res.status, 400, "Invalid sport code must return HTTP 400");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.message, /Invalid or unsupported sport code/i);
  });

  await t.test("4. Create Tournament with explicit CRICKET sport succeeds", async () => {
    const tourneyName = `Cricket Cup ${Date.now()}`;
    const res = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: tourneyName,
        format: "LEAGUE",
        startDate: "2026-09-01T10:00:00Z",
        endDate: "2026-09-10T10:00:00Z",
        sport: "CRICKET"
      })
    });

    assert.equal(res.status, 201, "Cricket tournament creation should return 201");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.name, tourneyName);
  });

  await t.test("5. Create Tournament with explicit BADMINTON sport succeeds", async () => {
    const tourneyName = `Badminton Open ${Date.now()}`;
    const res = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: tourneyName,
        format: "KNOCKOUT",
        startDate: "2026-09-15T10:00:00Z",
        endDate: "2026-09-20T10:00:00Z",
        sport: "BADMINTON"
      })
    });

    assert.equal(res.status, 201, "Badminton tournament creation should return 201");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.name, tourneyName);
  });

  await t.test("6. Tournament filtering by sport (GET /tournaments?sport=BADMINTON)", async () => {
    const res = await fetch(`${BASE_URL}/tournaments?sport=BADMINTON`);
    assert.equal(res.status, 200, "Filtering by sport must return HTTP 200");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0, "Badminton tournaments should be returned");
    json.data.forEach((t) => {
      assert.equal(t.sport?.code, "BADMINTON", "Every returned tournament must be Badminton");
    });
  });

  await t.test("7. Tournament filtering by sport (GET /tournaments?sport=CRICKET)", async () => {
    const res = await fetch(`${BASE_URL}/tournaments?sport=CRICKET`);
    assert.equal(res.status, 200, "Filtering by sport must return HTTP 200");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0, "Cricket tournaments should be returned");
    json.data.forEach((t) => {
      assert.equal(t.sport?.code, "CRICKET", "Every returned tournament must be Cricket");
    });
  });

  await t.test("8. Existing GET /tournaments without sport parameter works unchanged", async () => {
    const res = await fetch(`${BASE_URL}/tournaments`);
    assert.equal(res.status, 200, "Unfiltered GET /tournaments must return HTTP 200");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  await t.test("9. Unauthenticated tournament creation returns HTTP 401", async () => {
    const res = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Unauth Tourney ${Date.now()}`,
        format: "LEAGUE",
        startDate: "2026-09-01T10:00:00Z",
        endDate: "2026-09-10T10:00:00Z"
      })
    });
    assert.equal(res.status, 401, "Unauthenticated access should return 401");
  });
});
