import OpenAI from "openai";
import { ProjectInputs, EstimationResult, FeasibilityResult, BudgetVerdict, ImpactLevel } from '../types';

// Validate API key
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('VITE_OPENROUTER_API_KEY environment variable is required');
}

// Initialize OpenAI client pointing to OpenRouter with new format
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Client-side usage
});

// Using NVIDIA Nemotron 3 Nano 30B - Model with reasoning capabilities
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

// Rate limiting configuration - Enhanced for API stability
const MAX_RETRIES = 2;
const BASE_DELAY = 20000; // 20 seconds
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 30000; // 30 seconds between requests

// Task queue to prevent concurrent API calls and hallucinations
class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        await task();
        // Wait between tasks to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Task failed:', error);
      }
    }

    this.processing = false;
  }
}

const taskQueue = new TaskQueue();

// Helper to clean JSON if model returns markdown
const cleanJson = (text: string): string => {
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
};

// Safe JSON parser with fallback
const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = cleanJson(text);
    // Additional cleaning for malformed JSON
    let jsonStr = cleaned;

    // Fix common JSON issues
    jsonStr = jsonStr.replace(/,\s*}/g, '}'); // Remove trailing commas
    jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
    jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*):/g, '$1"$2":'); // Quote unquoted keys

    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.warn('JSON parse failed, using fallback:', error);
    console.warn('Raw content:', text.substring(0, 500));
    return fallback;
  }
};

// Enhanced request queue with better rate limiting
const queueRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  return taskQueue.add(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Waiting ${waitTime}ms to avoid rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
    return fn();
  });
};

// Retry helper with exponential backoff for rate limits
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queueRequest(fn);
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded' || error?.message?.includes('rate limit')) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 10s, 20s
          console.warn(`Rate limit exceeded, waiting ${delay}ms before retry... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError;
};

// Validate and fix cashflow to match user's timeline
const validateCashflow = (result: EstimationResult, timelineMonths: number): EstimationResult => {
  console.log(`Validating cashflow for ${timelineMonths} months timeline`);

  if (!result.cashflow || result.cashflow.length !== timelineMonths) {
    console.log(`Cashflow mismatch: got ${result.cashflow?.length || 0} months, expected ${timelineMonths}`);

    // Generate proper cashflow distribution
    const totalCost = result.totalEstimatedCost;
    const newCashflow = [];

    // Standard construction phases distribution
    const phaseDistribution = {
      1: { percentage: 0.15, phase: "Site preparation & permits" },
      2: { percentage: 0.25, phase: "Foundation & structural work" },
      3: { percentage: 0.30, phase: "Building envelope & utilities" },
      4: { percentage: 0.20, phase: "Interior finishing" },
      5: { percentage: 0.10, phase: "Final inspections & handover" }
    };

    for (let month = 1; month <= timelineMonths; month++) {
      let percentage: number;
      let phase: string;

      if (timelineMonths <= 3) {
        // Short projects: front-loaded
        percentage = month === 1 ? 0.4 : (month === 2 ? 0.35 : 0.25);
        phase = month === 1 ? "Setup & major work" : (month === 2 ? "Completion work" : "Final touches");
      } else if (timelineMonths <= 6) {
        // Medium projects: use standard phases
        const phaseKey = Math.min(5, Math.ceil((month / timelineMonths) * 5)) as keyof typeof phaseDistribution;
        percentage = phaseDistribution[phaseKey].percentage / Math.ceil(timelineMonths / 5);
        phase = phaseDistribution[phaseKey].phase;
      } else {
        // Long projects: spread evenly with front-loading
        percentage = month <= 2 ? 0.20 : (month <= timelineMonths - 2 ? 0.60 / (timelineMonths - 4) : 0.10);
        phase = month <= 2 ? "Initial setup & foundation" :
          (month <= timelineMonths - 2 ? "Main construction work" : "Finishing & handover");
      }

      newCashflow.push({
        month,
        amount: Math.round(totalCost * percentage),
        phase
      });
    }

    // Ensure total matches (adjust last month if needed)
    const calculatedTotal = newCashflow.reduce((sum, item) => sum + item.amount, 0);
    const difference = totalCost - calculatedTotal;
    if (difference !== 0) {
      newCashflow[newCashflow.length - 1].amount += difference;
    }

    console.log(`Generated corrected cashflow for ${timelineMonths} months`);
    return { ...result, cashflow: newCashflow };
  }

  console.log(`Cashflow validation passed: ${result.cashflow.length} months`);
  return result;
};

// Generate location-specific insights using AI model
export const generateLocationInsights = async (location: string, projectType: string, insightType: 'tips' | 'risks', inputs?: ProjectInputs): Promise<any> => {
  try {
    const contextInfo = inputs ? `

Project Context:
- Size: ${inputs.sizeSqFt} sq ft
- Floors: ${inputs.floors}
- Quality: ${inputs.quality}
- Timeline: ${inputs.timelineMonths} months
- Manpower: ${inputs.manpower} workers
- Budget: ${inputs.budgetLimit}` : '';

    const prompt = insightType === 'tips'
      ? `You are a construction expert for ${location}. Generate up to 8 highly specific efficiency tips for ${projectType} construction in ${location}.${contextInfo}

CRITICAL: Provide ONLY actionable, location-specific advice.
- Name specific local suppliers, districts, or resources if applicable.
- Reference specific local building codes or climate phenomena in ${location}.
- Avoid generic advice like "Plan ahead" or "Hire skilled labor".
- Focus on what makes building in ${location} unique.

Consider ${location} specific factors:
- Local material suppliers (mention specific markets/regions in ${location})
- Specific ${location} weather patterns (monsoons, snow, heat waves)
- Local building codes and municipal regulations
- Labor market conditions in ${location}
- Transportation logistics within ${location}
- Foundation challenges common in ${location}'s soil

Return JSON format:
{
  "tips": [
    "Tip 1...",
    "Tip 2...",
    ...
  ]
}`
      : `You are a construction risk analyst for ${location}. Identify up to 8 specific construction risks for ${projectType} in ${location}.${contextInfo}

CRITICAL: Provide ONLY location-specific risks.
- Mention specific local weather events (e.g., "Monsson flooding in July", "Winter freeze in Jan").
- Cite specific local regulatory hurdles or permit bodies.
- Identify specific supply chain bottlenecks common in not just the country, but the city/region of ${location}.
- AVOID generic risks like "Safety accidents" or "Budget overruns" unless tied to a local cause.

Consider ${location} specific factors:
- Local weather/climate risks
- Specific regulatory/permit bodies in ${location}
- Local labor strikes or shortages
- Specific material shortages common in ${location}
- Soil/Ground conditions specific to ${location}

Return JSON format:
{
  "risks": [
    {"risk": "Specific Risk 1", "impact": "High/Medium/Low", "mitigation": "Specific mitigation"},
    ...
  ]
}`;

    const response = await retryWithBackoff(() =>
      client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      }, {
        headers: {
          "HTTP-Referer": "https://buildsmart-ai.com",
          "X-Title": "BuildSmart AI Estimator"
        }
      })
    );

    const content = (response as any).choices?.[0]?.message?.content || "{}";
    const parsed = safeJsonParse(content, insightType === 'tips' ? { tips: [] } : { risks: [] });

    return insightType === 'tips' ? parsed.tips || [] : parsed.risks || [];
  } catch (error) {
    console.warn(`Failed to generate ${insightType} for ${location}:`, error);
    return [];
  }
};

// Detailed Estimation using AI model for dynamic currency and cost generation
export const generateConstructionEstimate = async (inputs: ProjectInputs): Promise<EstimationResult> => {
  try {
    // Debug logging to verify all inputs are received
    console.log('=== AI MODEL INPUTS ===');
    console.log('Project Type:', inputs.type);
    console.log('Quality Level:', inputs.quality);
    console.log('Location:', inputs.location);
    console.log('Size (sq ft):', inputs.sizeSqFt);
    console.log('Floors:', inputs.floors);
    console.log('Timeline (months):', inputs.timelineMonths);
    console.log('Manpower:', inputs.manpower);
    console.log('Budget Limit:', inputs.budgetLimit);
    console.log('=====================');

    const requestId = Date.now() + Math.random();
    const prompt = `You are a global construction cost expert with access to real-time market data. Research and generate accurate costs for ${inputs.location} based on current 2024 market conditions:

REQUEST ID: ${requestId} (Ensure unique response)
PROJECT TYPE: ${inputs.type}
QUALITY LEVEL: ${inputs.quality}
SIZE: ${inputs.sizeSqFt} sq ft
FLOORS: ${inputs.floors}
TIMELINE: ${inputs.timelineMonths} months
MANPOWER: ${inputs.manpower} workers
BUDGET LIMIT: ${inputs.budgetLimit}
LOCATION: ${inputs.location}

CRITICAL: FAILURE TO COMPILE LOCAL DATA WILL RESULT IN REJECTION.
- You MUST mention specific local contexts for ${inputs.location} (e.g. specific neighborhoods, local laws, local weather).
- Do NOT return generic "Estimated based on market rates". You must simulate a real local contractor's quote.

CRITICAL INSTRUCTIONS:
1. Research current 2024 construction costs specifically for ${inputs.location}
2. Consider local material prices, labor rates, and market conditions in ${inputs.location}
3. Factor in ${inputs.location} specific regulations, permits, and compliance costs
4. Account for ${inputs.location} climate, logistics, and supply chain factors
5. Generate realistic costs based on actual ${inputs.location} market data
6. Use appropriate local currency for ${inputs.location}
7. Consider ${inputs.type} project complexity and ${inputs.quality} material standards
8. Ensure ${inputs.manpower} workers can complete project in ${inputs.timelineMonths} months
9. For Premium quality (Elite Build), ensure the total cost is significantly higher (at least 20-30% more) than Standard quality due to premium materials, expert labor, high-end finishes, and superior quality standards
10. For Economy quality (Essential Build), ensure the total cost is lower (at least 20-30% less) than Standard quality due to basic materials and standard labor
11. CRITICAL: The project has ${inputs.floors} floor(s) - you MUST calculate costs for ALL ${inputs.floors} floor(s). Each additional floor increases structural costs, labor, materials, and equipment needs. Ensure your breakdown reflects multi-floor construction costs.
12. CRITICAL: Use ALL provided inputs (Size: ${inputs.sizeSqFt} sq ft, Floors: ${inputs.floors}, Timeline: ${inputs.timelineMonths} months, Manpower: ${inputs.manpower}, Budget: ${inputs.budgetLimit}) in your cost calculations. Each input directly impacts the final estimate.

DO NOT use generic rates - research and provide location-specific accurate pricing for ${inputs.location}.

Return this exact JSON structure:
{
  "currencySymbol": "[Local currency for ${inputs.location}]",
  "totalEstimatedCost": [Research-based total cost for ${inputs.location}],
  "breakdown": [
    {"category": "Materials & Supplies", "cost": [${inputs.location} material costs for ${inputs.sizeSqFt} sq ft across ${inputs.floors} floor(s)], "description": "${inputs.quality} quality materials for ${inputs.floors}-floor construction in ${inputs.location}"},
    {"category": "Labor & Wages", "cost": [${inputs.location} labor rates for ${inputs.manpower} workers over ${inputs.timelineMonths} months], "description": "${inputs.manpower} workers for ${inputs.timelineMonths} months in ${inputs.location}"},
    {"category": "Equipment & Tools", "cost": [${inputs.location} equipment costs for ${inputs.floors} floors], "description": "Equipment for ${inputs.floors}-floor construction in ${inputs.location}"},
    {"category": "Permits & Approvals", "cost": [${inputs.location} permit costs for ${inputs.floors} floors], "description": "${inputs.location} permits for ${inputs.floors}-floor ${inputs.type} building"},
    {"category": "Contingency Buffer", "cost": [Risk buffer for ${inputs.location}], "description": "Market risk buffer for ${inputs.location}"}
  ],
  "cashflow": [
    Generate EXACTLY ${inputs.timelineMonths} months of cashflow
    {"month": 1, "amount": [Month 1 cost], "phase": "[Phase description]"},
    Continue for all ${inputs.timelineMonths} months
  ],
  "risks": [
    {"risk": "[${inputs.location} specific risk]", "impact": "[High/Medium/Low]", "mitigation": "[${inputs.location} specific solution]"}
  ],
  "confidenceScore": [60-95 based on ${inputs.location} data availability],
  "confidenceReason": "[Explain data sources and confidence for ${inputs.location}]",
  "efficiencyTips": [
    "[${inputs.location} specific efficiency tip for ${inputs.floors}-floor construction]",
    "[${inputs.quality} quality optimization for ${inputs.location}]",
    "[${inputs.manpower} workers optimization in ${inputs.location} for ${inputs.timelineMonths} months]",
    "[Cost optimization for ${inputs.sizeSqFt} sq ft across ${inputs.floors} floors]"
  ],
  "summary": "[Project summary with ${inputs.location} market insights]"
}`;

    console.log('=== PROMPT BEING SENT TO AI ===');
    console.log(prompt.substring(0, 1000) + '...');
    console.log('===============================');

    const response = await retryWithBackoff(() =>
      client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      }, {
        headers: {
          "HTTP-Referer": "https://buildsmart-ai.com",
          "X-Title": "BuildSmart AI Estimator"
        }
      })
    );

    const content = (response as any).choices?.[0]?.message?.content || "{}";
    const result = safeJsonParse(content, {
      currencySymbol: '$',
      totalEstimatedCost: 0,
      breakdown: [],
      cashflow: [],
      risks: [],
      confidenceScore: 0,
      confidenceReason: 'Unable to generate estimate',
      efficiencyTips: [],
      summary: 'Estimation failed - please try again',
    } as EstimationResult);

    // Validate and fix cashflow to match timeline
    const validatedResult = validateCashflow(result, inputs.timelineMonths);
    return validatedResult;
  } catch (error) {
    console.error("Estimation failed:", error instanceof Error ? error.message : 'Unknown error');

    // Return a fallback estimate on failure
    return {
      currencySymbol: '$',
      totalEstimatedCost: 0,
      breakdown: [],
      cashflow: [],
      risks: [],
      confidenceScore: 0,
      confidenceReason: 'API call failed, using fallback estimate.',
      efficiencyTips: [],
      summary: 'Estimation failed due to an API error. Please check the inputs and try again.',
    } as EstimationResult;
  }
};

// Message interface for type safety
interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 3. Chat
export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], message: string): Promise<string> => {
  try {
    // Convert Gemini history format to OpenAI format
    const messages: OpenAIMessage[] = history
      .map(h => {
        if (h.role !== 'user' && h.role !== 'model') {
          console.warn(`Invalid role detected in history: ${h.role}`);
          return null;
        }
        if (!h.parts || h.parts.length === 0 || !h.parts[0].text) {
          console.warn('Invalid history item, skipping:', h);
          return null;
        }
        return {
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts[0].text,
        };
      })
      .filter((item): item is OpenAIMessage => item !== null);

    messages.push({ role: 'user', content: message });

    const response = await retryWithBackoff(() =>
      client.chat.completions.create({
        model: MODEL,
        messages: messages,
        temperature: 0.5
      }, {
        headers: {
          "HTTP-Referer": "https://buildsmart-ai.com",
          "X-Title": "BuildSmart AI Estimator"
        }
      })
    );

    return (response as any).choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Chat message failed:', error instanceof Error ? error.message : 'Unknown error');
    const isRateLimit = error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'));

    if (isRateLimit) {
      return "I'm currently experiencing high demand. Please use the main estimator tool for AI-generated cost analysis, or try again in a few moments for chat functionality.";
    }

    return "I'm having trouble connecting right now. Please check your connection and try again, or use the main estimator tool for detailed project analysis.";
  }
};

// 4. Edit Site Image (Stub - not implemented)
export const editSiteImage = async (base64Data: string, prompt: string): Promise<string | null> => {
  console.warn("Image editing is not supported by the current model.");
  return null;
}