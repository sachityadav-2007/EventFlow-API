const express = require("express");

const router = express.Router();


router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Events route is working",
  });
});

module.exports = router;