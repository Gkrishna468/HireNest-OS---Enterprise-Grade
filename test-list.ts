import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

async function run() {
  try {
    const list = await ai.models.list();
    for await (const m of list) {
        console.log(m.name);
    }
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}

run();
