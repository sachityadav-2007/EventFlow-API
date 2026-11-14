const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const eventsFile = path.join(__dirname, "../data/events.json");

// Get all events
router.get("/", (req, res) => {
  const data = fs.readFileSync(eventsFile, "utf8");
  const events = JSON.parse(data);

  res.json({
    success: true,
    events: events,
  });
});

// Get a single event by ID
router.get("/:id", (req, res) => {
  const eventId = Number(req.params.id);

  const data = fs.readFileSync(eventsFile, "utf8");
  const events = JSON.parse(data);

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

// Create a new event
router.post("/", (req, res) => {
  const { title, date, location, maxParticipants } = req.body;

  // Check if all event details are provided
  if (!title || !date || !location || !maxParticipants) {
    return res.status(400).json({
      success: false,
      message: "Please provide all event details",
    });
  }

  // Read existing events
  const data = fs.readFileSync(eventsFile, "utf8");
  const events = JSON.parse(data);

  // Create a new event
  const newEvent = {
    id: Date.now(),
    title,
    date,
    location,
    maxParticipants: Number(maxParticipants),
  };

  // Add the event to the array
  events.push(newEvent);

  // Save the updated events
  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    event: newEvent,
  });
});

module.exports = router;