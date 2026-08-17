import http from "http";
import app from "../app.js";

async function runAuthIntegrationTests() {
  console.log("🔐 ===================================================");
  console.log("🔐 CRICLIVE Enterprise: Auth API & Integration Tests");
  console.log("🔐 ===================================================");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testUser = {
    firstName: "Test",
    lastName: "User",
    email: `viewer_${timestamp}@criclive.com`,
    password: "TestUser@12345",
    role: "VIEWER"
  };

  try {
    // 1. Test Registration
    console.log("\n🧪 1. User Registration (POST /auth/register)");
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser)
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, "Registration returns 201 Created", `Got status ${regRes.status}`);
    assert(regData.success === true, "Registration returns success: true");
    assert(regData.data?.email === testUser.email, "Returned email matches registered email");
    assert(regData.data?.role === "VIEWER", "Registered role is VIEWER");

    // 2. Duplicate Registration Rejection
    console.log("\n🧪 2. Duplicate Registration Rejection (409 Conflict)");
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser)
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, "Duplicate registration rejected with 409 Conflict", `Got status ${dupRes.status}`);
    assert(dupData.message === "Email already registered.", "Returns user-friendly duplicate message");

    // 3. Validation Failure on Invalid Email
    console.log("\n🧪 3. Validation Errors (400 Bad Request)");
    const badRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "A",
        lastName: "B",
        email: "not-an-email",
        password: "short",
        role: "VIEWER"
      })
    });
    const badData = await badRes.json();
    assert(badRes.status === 400, "Invalid payload rejected with 400 Bad Request", `Got status ${badRes.status}`);
    assert(badData.success === false, "Returns success: false on validation error");
    assert(Array.isArray(badData.errors), "Returns array of field errors");

    // 4. Successful Login
    console.log("\n🧪 4. User Login (POST /auth/login)");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, "Login returns 200 OK", `Got status ${loginRes.status}`);
    assert(loginData.success === true, "Login returns success: true");
    assert(typeof loginData.data?.token === "string" && loginData.data.token.length > 20, "Returns valid JWT token");
    assert(loginData.data?.user?.email === testUser.email, "Returned user info has correct email");
    assert(loginData.data?.user?.role === "VIEWER", "Returned user role is VIEWER");

    const token = loginData.data.token;

    // 5. Protected Profile Access
    console.log("\n🧪 5. Protected Profile Access (GET /auth/profile)");
    const profRes = await fetch(`${baseUrl}/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    const profData = await profRes.json();
    assert(profRes.status === 200, "Profile returns 200 OK with Bearer token", `Got status ${profRes.status}`);
    assert(profData.data?.email === testUser.email, "Profile data matches authenticated user");

    // 6. Invalid Password Rejection
    console.log("\n🧪 6. Invalid Password Login (401 Unauthorized)");
    const failLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: "WrongPassword@999"
      })
    });
    const failLoginData = await failLoginRes.json();
    assert(failLoginRes.status === 401, "Invalid password returns 401 Unauthorized", `Got status ${failLoginRes.status}`);
    assert(failLoginData.success === false, "Returns success: false");

  } catch (err) {
    console.error("❌ Test error:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n===================================================`);
  console.log(`📊 Auth Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthIntegrationTests();
