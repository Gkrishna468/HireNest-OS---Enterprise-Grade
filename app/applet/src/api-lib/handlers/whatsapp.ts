import express from "express";
import { IntakeEngine } from "../intake/IntakeEngine.js";
import { db } from "../../lib/firebase-admin.js";

const whatsappHandler = express.Router();

whatsappHandler.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    
    // Process via Universal Intake Engine
    await IntakeEngine.process(payload, "whatsapp");

    res.status(200).json({ success: true, message: "Processed by Universal Intake" });
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

whatsappHandler.get("/status", async (req, res) => {
  try {
    res.status(200).json({
      status: "Connected",
      phone: "+1 (555) 019-8832",
      session: "Healthy",
      expires: "Never",
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    console.error("Status Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

whatsappHandler.get("/metrics", async (req, res) => {
  try {
    res.status(200).json({
      messagesToday: 148,
      profilesParsed: 52,
      requirementsParsed: 11,
      voiceNotes: 7,
      ocrImages: 14,
      duplicates: 4,
      manualReview: 2,
      automationSuccess: 98
    });
  } catch (error) {
    console.error("Metrics Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default whatsappHandler;
