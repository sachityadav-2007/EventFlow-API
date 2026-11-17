// Validation schemas using api-contract-guard rules

const createEventSchema = {
  title: {
    type: "string",
    required: true,
    minLength: 3,
  },
  date: {
    type: "string",
    required: true,
  },
  location: {
    type: "string",
    required: true,
    minLength: 2,
  },
  maxParticipants: {
    type: "number",
    required: true,
    min: 1,
  },
};

const updateEventSchema = {
  title: {
    type: "string",
    required: true,
    minLength: 3,
  },
  date: {
    type: "string",
    required: true,
  },
  location: {
    type: "string",
    required: true,
    minLength: 2,
  },
  maxParticipants: {
    type: "number",
    required: true,
    min: 1,
  },
};

const registrationSchema = {
  name: {
    type: "string",
    required: true,
    minLength: 2,
  },
  email: {
    type: "email",
    required: true,
  },
  eventId: {
    type: "number",
    required: true,
    min: 1,
  },
};

module.exports = {
  createEventSchema,
  updateEventSchema,
  registrationSchema,
};
