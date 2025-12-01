import { GoogleGenAI } from "@google/genai";
import { Order } from '../types';

// Note: In a real app, API keys should be handled securely on the backend (Master Server),
// not the frontend. For this simulator, we assume the Master view has access.

let genAI: GoogleGenAI | null = null;

// Initialize conditionally to avoid errors if env not set in demo
try {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (e) {
  console.warn("Gemini API Key not found");
}

export const analyzeOrderWithGemini = async (order: Order): Promise<string> => {
  if (!genAI) return "Gemini API Key missing. Please set process.env.API_KEY.";

  const itemsList = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
  
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a Michelin-star head chef analyzing an incoming POS order.
        The order contains: ${itemsList}.
        
        Provide a very short, witty, or helpful "Chef's Comment" (max 15 words) that will appear on the Kitchen Display System.
        Examples: "Start the fries early.", "Heavy on the dairy.", "Classic pairing choice."
      `,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI analysis unavailable.";
  }
};

export const generateDailyInsight = async (orders: Order[]): Promise<string> => {
    if (!genAI) return "Gemini API Key missing.";

    if (orders.length === 0) return "No data to analyze yet.";

    const summary = orders.map(o => ({
        total: o.totalAmount,
        items: o.items.map(i => i.name).join(', ')
    }));

    try {
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                Analyze these recent restaurant orders and give me a 1-sentence strategic business insight 
                about sales trends or popular combinations.
                Data: ${JSON.stringify(summary)}
            `
        });
        return response.text.trim();
    } catch (e) {
        return "Could not generate insight.";
    }
}