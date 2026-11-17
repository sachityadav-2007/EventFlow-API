const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const { Readable } = require("stream");
const app = require("../src/index");

const eventsFile = path.join(__dirname, "../src/data/events.json");
const registrationsFile = path.join(__dirname, "../src/data/registrations.json");

// Helper to simulate HTTP requests in-memory without external sockets
function request(app, { method = "GET", url = "/", body, rawBody, headers = {} }) {
  let req;
  const allHeaders = { ...headers };

  if (rawBody !== undefined) {
    const stream = Readable.from([rawBody]);
    req = Object.assign(stream, {
      method,
      url,
      originalUrl: url,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(rawBody).toString(),
        ...allHeaders,
      },
    });
  } else {
    req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { "content-type": "application/json", ...allHeaders };
    req.body = body;
  }

  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k, v) => {
    res.headers[k.toLowerCase()] = v;
  };
  res.getHeader = (k) => res.headers[k.toLowerCase()];
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  return new Promise((resolve) => {
    res.json = (data) => resolve({ status: res.statusCode, body: data });
    res.send = (data) => resolve({ status: res.statusCode, body: data });
    res.end = (data) => resolve({ status: res.statusCode, body: data });

    app(req, res);
  });
}

// Backup and restore data files to keep sample data clean
let originalEvents;
let originalRegistrations;

test.before(() => {
  originalEvents = fs.readFileSync(eventsFile, "utf8");
  originalRegistrations = fs.readFileSync(registrationsFile, "utf8");
});

test.after(() => {
  fs.writeFileSync(eventsFile, originalEvents);
  fs.writeFileSync(registrationsFile, originalRegistrations);
});

test("Root Endpoint", async (t) => {
  await t.test("GET / returns welcome message", async () => {
    const res = await request(app, { method: "GET", url: "/" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Welcome to EventFlow API");
  });
});

test("Event CRUD & api-contract-guard Validation", async (t) => {
  let createdEventId;

  await t.test("GET /api/events returns all events", async () => {
    const res = await request(app, { method: "GET", url: "/api/events" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.events));
    assert.ok(res.body.events.length >= 2);
  });

  await t.test("GET /api/events/1 returns existing event", async () => {
    const res = await request(app, { method: "GET", url: "/api/events/1" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.event.id, 1);
    assert.strictEqual(res.body.event.title, "Campus Hackathon 2026");
  });

  await t.test("GET /api/events/:id returns 400 for invalid ID", async () => {
    const res = await request(app, { method: "GET", url: "/api/events/not-a-number" });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Invalid event ID");
  });

  await t.test("GET /api/events/:id returns 404 for nonexistent event", async () => {
    const res = await request(app, { method: "GET", url: "/api/events/999999" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Event not found");
  });

  await t.test("POST /api/events fails with 422 when required fields are missing (api-contract-guard)", async () => {
    const res = await request(app, { method: "POST", url: "/api/events", body: {} });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Validation failed");
    assert.strictEqual(res.body.errors.title, "This field is required");
    assert.strictEqual(res.body.errors.date, "This field is required");
    assert.strictEqual(res.body.errors.location, "This field is required");
    assert.strictEqual(res.body.errors.maxParticipants, "This field is required");
  });

  await t.test("POST /api/events fails with 422 for incorrect field types (api-contract-guard)", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/events",
      body: {
        title: 12345,
        date: "2026-11-20",
        location: "Auditorium",
        maxParticipants: "one hundred",
      },
    });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errors.title, "Must be a string");
    assert.strictEqual(res.body.errors.maxParticipants, "Must be a number");
  });

  await t.test("POST /api/events fails with 422 for boundary rule violations (api-contract-guard)", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/events",
      body: {
        title: "AI", // minLength 3
        date: "2026-11-20",
        location: "A", // minLength 2
        maxParticipants: 0, // min 1
      },
    });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errors.title, "Minimum 3 characters required");
    assert.strictEqual(res.body.errors.location, "Minimum 2 characters required");
    assert.strictEqual(res.body.errors.maxParticipants, "Value must be at least 1");
  });

  await t.test("POST /api/events creates an event successfully", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/events",
      body: {
        title: "Node.js Workshop 2026",
        date: "2026-12-10",
        location: "Seminar Hall C",
        maxParticipants: 80,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.event.title, "Node.js Workshop 2026");
    assert.strictEqual(res.body.event.maxParticipants, 80);
    createdEventId = res.body.event.id;
  });

  await t.test("PUT /api/events/:id updates event successfully", async () => {
    const res = await request(app, {
      method: "PUT",
      url: `/api/events/${createdEventId}`,
      body: {
        title: "Node.js & Express Workshop 2026",
        date: "2026-12-15",
        location: "Main Auditorium",
        maxParticipants: 120,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.event.title, "Node.js & Express Workshop 2026");
    assert.strictEqual(res.body.event.maxParticipants, 120);
  });

  await t.test("PUT /api/events/:id returns 422 when update body fails validation", async () => {
    const res = await request(app, {
      method: "PUT",
      url: `/api/events/${createdEventId}`,
      body: {
        title: "OK", // minLength 3 violation
        date: "2026-12-15",
        location: "Main Auditorium",
        maxParticipants: -1, // min 1 violation
      },
    });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.errors.title);
    assert.ok(res.body.errors.maxParticipants);
  });

  await t.test("PUT /api/events/:id returns 404 for nonexistent event", async () => {
    const res = await request(app, {
      method: "PUT",
      url: "/api/events/999999",
      body: {
        title: "Nonexistent",
        date: "2026-12-15",
        location: "Nowhere",
        maxParticipants: 10,
      },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Event not found");
  });

  await t.test("DELETE /api/events/:id deletes the created event", async () => {
    const res = await request(app, {
      method: "DELETE",
      url: `/api/events/${createdEventId}`,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Event deleted successfully");

    // Verify deletion
    const verifyRes = await request(app, { method: "GET", url: `/api/events/${createdEventId}` });
    assert.strictEqual(verifyRes.status, 404);
  });

  await t.test("DELETE /api/events/:id returns 404 for nonexistent event", async () => {
    const res = await request(app, { method: "DELETE", url: "/api/events/999999" });
    assert.strictEqual(res.status, 404);
  });
});

test("Registration API & Capacity Management", async (t) => {
  let tempEventId;
  let registrationId;

  await t.test("Setup: Create event with capacity 1", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/events",
      body: {
        title: "Exclusive Masterclass",
        date: "2026-12-28",
        location: "Boardroom",
        maxParticipants: 1,
      },
    });
    assert.strictEqual(res.status, 201);
    tempEventId = res.body.event.id;
  });

  await t.test("POST /api/registrations fails with 422 for invalid email (api-contract-guard)", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "John Doe",
        email: "not-an-email",
        eventId: tempEventId,
      },
    });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errors.email, "Invalid email format");
  });

  await t.test("POST /api/registrations fails with 422 for non-numeric eventId (api-contract-guard)", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "John Doe",
        email: "john@example.com",
        eventId: "abc",
      },
    });
    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errors.eventId, "Must be a number");
  });

  await t.test("POST /api/registrations fails with 404 for nonexistent event", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "John Doe",
        email: "john@example.com",
        eventId: 888888,
      },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.message, "Event not found");
  });

  await t.test("POST /api/registrations succeeds for valid registration", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "John Doe",
        email: "john@example.com",
        eventId: tempEventId,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.registration.name, "John Doe");
    assert.strictEqual(res.body.registration.email, "john@example.com");
    registrationId = res.body.registration.id;
  });

  await t.test("POST /api/registrations fails with 409 for duplicate registration", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "John Doe",
        email: "JOHN@example.com", // case-insensitive check
        eventId: tempEventId,
      },
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Student is already registered for this event");
  });

  await t.test("POST /api/registrations fails with 400 when event capacity is reached", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/registrations",
      body: {
        name: "Second Student",
        email: "second@example.com",
        eventId: tempEventId,
      },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("capacity reached"));
  });

  await t.test("GET /api/registrations returns all registrations", async () => {
    const res = await request(app, { method: "GET", url: "/api/registrations" });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.registrations));
    assert.ok(res.body.registrations.length >= 1);
  });

  await t.test("GET /api/registrations?eventId=:id filters registrations", async () => {
    const res = await request(app, {
      method: "GET",
      url: `/api/registrations?eventId=${tempEventId}`,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.registrations.length, 1);
    assert.strictEqual(res.body.registrations[0].email, "john@example.com");
  });

  await t.test("GET /api/registrations/:id returns registration by ID", async () => {
    const res = await request(app, {
      method: "GET",
      url: `/api/registrations/${registrationId}`,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.registration.id, registrationId);
  });

  await t.test("DELETE /api/registrations/:id cancels registration", async () => {
    const res = await request(app, {
      method: "DELETE",
      url: `/api/registrations/${registrationId}`,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, "Registration cancelled successfully");

    // Verify cancellation
    const verifyRes = await request(app, {
      method: "GET",
      url: `/api/registrations/${registrationId}`,
    });
    assert.strictEqual(verifyRes.status, 404);
  });

  await t.test("Cleanup: Delete temporary event", async () => {
    await request(app, { method: "DELETE", url: `/api/events/${tempEventId}` });
  });
});

test("Error Handling & Bad Request Scenarios", async (t) => {
  await t.test("GET /api/nonexistent-route returns 404 JSON response", async () => {
    const res = await request(app, { method: "GET", url: "/api/nonexistent-route" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Route not found");
  });

  await t.test("POST /api/events with malformed JSON returns 400", async () => {
    const res = await request(app, {
      method: "POST",
      url: "/api/events",
      rawBody: '{ "title": "Malformed JSON without closing',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Invalid JSON payload in request body");
  });
});
