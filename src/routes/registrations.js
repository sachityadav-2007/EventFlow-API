const express = require("express");
const fs = require("fs");
const path = require("path");
const { validate } = require("api-contract-guard");
const { registrationSchema } = require("../schemas");

const router = express.Router();
const registrationsFile = path.join(__dirname, "../data/registrations.json");
const eventsFile = path.join(__dirname, "../data/events.json");

// Helper function to read registrations safely
function getRegistrations() {
  try {
    if (!fs.existsSync(registrationsFile)) {
      fs.writeFileSync(registrationsFile, "[]");
      return [];
    }
    const data = fs.readFileSync(registrationsFile, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

// Helper function to save registrations safely
function saveRegistrations(registrations) {
  fs.writeFileSync(registrationsFile, JSON.stringify(registrations, null, 2));
}

// Helper function to read events safely
function getEvents() {
  try {
    if (!fs.existsSync(eventsFile)) {
      fs.writeFileSync(eventsFile, "[]");
      return [];
    }
    const data = fs.readFileSync(eventsFile, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

// Get all registrations
router.get("/", (req, res) => {
  const registrations = getRegistrations();
  res.json({
    success: true,
    registrations: registrations,
  });
});

// Get a single registration by ID
router.get("/:id", (req, res) => {
  const regId = Number(req.params.id);

  if (isNaN(regId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration ID",
    });
  }

  const registrations = getRegistrations();
  const registration = registrations.find((item) => item.id === regId);

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: "Registration not found",
    });
  }

  res.json({
    success: true,
    registration: registration,
  });
});

// Register for an event with api-contract-guard validation
router.post("/", validate(registrationSchema), (req, res) => {
  const { name, email, eventId } = req.body;

  // Verify that the event exists
  const events = getEvents();
  const event = events.find((item) => item.id === eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  const registrations = getRegistrations();

  // Prevent duplicate registration for the same event and email
  const existingRegistration = registrations.find(
    (item) => item.eventId === eventId && item.email.toLowerCase() === email.toLowerCase()
  );

  if (existingRegistration) {
    return res.status(409).json({
      success: false,
      message: "Student is already registered for this event",
    });
  }

  // Check event capacity
  const eventRegistrationsCount = registrations.filter(
    (item) => item.eventId === eventId
  ).length;

  if (eventRegistrationsCount >= event.maxParticipants) {
    return res.status(400).json({
      success: false,
      message: "Event capacity reached. No more registrations accepted.",
    });
  }

  // Create new registration
  const newRegistration = {
    id: Date.now(),
    name,
    email,
    eventId,
    registeredAt: new Date().toISOString(),
  };

  registrations.push(newRegistration);
  saveRegistrations(registrations);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    registration: newRegistration,
  });
});

// Cancel a registration by ID
router.delete("/:id", (req, res) => {
  const regId = Number(req.params.id);

  if (isNaN(regId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration ID",
    });
  }

  const registrations = getRegistrations();
  const index = registrations.findIndex((item) => item.id === regId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Registration not found",
    });
  }

  registrations.splice(index, 1);
  saveRegistrations(registrations);

  res.json({
    success: true,
    message: "Registration cancelled successfully",
  });
});

module.exports = router;
