
import { GoogleGenAI } from "@google/genai";
import { Order } from '../types';

// Note: In a real app, API keys should be handled securely on the backend (Master Server),
// not the frontend. For this simulator, we assume the Master view has access.

let genAI: GoogleGenAI | null = null;

// Initialize conditionally to avoid errors if env not set in demo
try {
  // Safely check if process is defined (Node/Bundler env) before accessing .env
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (e) {
  console.warn("Gemini API Key not found or process not defined");
}

export const analyzeOrderWithGemini = async (order: Order): Promise<string> => {
  if (!genAI) return "AI service unavailable (Key missing).";

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
    
    return response.text ? response.text.trim() : "No comment.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI analysis unavailable.";
  }
};

export const generateDailyInsight = async (orders: Order[]): Promise<string> => {
    if (!genAI) return "Gemini API Key missing.";

    if (orders.length === 0) return "No data to analyze yet.";

    // Include timestamps to allow time-based trend analysis
    const summary = orders.map(o => ({
        time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: o.totalAmount,
        items: o.items.map(i => i.name).join(', ')
    }));

    try {
        const response = await genAI.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `
                Analyze these recent restaurant orders to determine "which time which order will moving more".
                
                You must identify specific time blocks where certain items have higher sales volume.
                Look for patterns connecting the time of day to the specific items purchased.
                
                Provide a strategic business insight.
                
                Data: ${JSON.stringify(summary)}
            `,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        return response.text ? response.text.trim() : "Analysis failed.";
    } catch (e) {
        console.error("Gemini Insight Error:", e);
        return "Could not generate insight.";
    }
}
