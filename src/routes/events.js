const express = require("express");
const fs = require("fs");
const path = require("path");
const { validate } = require("api-contract-guard");
const { createEventSchema, updateEventSchema } = require("../schemas");

const router = express.Router();
const eventsFile = path.join(__dirname, "../data/events.json");

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

// Helper function to save events safely
function saveEvents(events) {
  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
}

// Get all events
router.get("/", (req, res) => {
  const events = getEvents();
  res.json({
    success: true,
    events: events,
  });
});

// Get a single event by ID
router.get("/:id", (req, res) => {
  const eventId = Number(req.params.id);

  if (isNaN(eventId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid event ID",
    });
  }

  const events = getEvents();
  const event = events.find((item) => item.id === eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  res.json({
    success: true,
    event: event,
  });
});

// Create a new event with api-contract-guard validation
router.post("/", validate(createEventSchema), (req, res) => {
  const { title, date, location, maxParticipants } = req.body;
  const events = getEvents();

  const newEvent = {
    id: Date.now(),
    title,
    date,
    location,
    maxParticipants: Number(maxParticipants),
  };

  events.push(newEvent);
  saveEvents(events);

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    event: newEvent,
  });
});

// Update an existing event with api-contract-guard validation
router.put("/:id", validate(updateEventSchema), (req, res) => {
  const eventId = Number(req.params.id);

  if (isNaN(eventId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid event ID",
    });
  }

  const events = getEvents();
  const eventIndex = events.findIndex((item) => item.id === eventId);

  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  const { title, date, location, maxParticipants } = req.body;

  const updatedEvent = {
    ...events[eventIndex],
    title,
    date,
    location,
    maxParticipants: Number(maxParticipants),
  };

  events[eventIndex] = updatedEvent;
  saveEvents(events);

  res.json({
    success: true,
    message: "Event updated successfully",
    event: updatedEvent,
  });
});

// Delete an event by ID
router.delete("/:id", (req, res) => {
  const eventId = Number(req.params.id);

  if (isNaN(eventId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid event ID",
    });
  }

  const events = getEvents();
  const eventIndex = events.findIndex((item) => item.id === eventId);

  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  events.splice(eventIndex, 1);
  saveEvents(events);

  res.json({
    success: true,
    message: "Event deleted successfully",
  });
});

module.exports = router;
