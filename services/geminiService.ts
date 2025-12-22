import OpenAI from "openai";
import { ProjectInputs, EstimationResult, FeasibilityResult, BudgetVerdict, ImpactLevel } from '../types';

// Validate API key
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('VITE_OPENROUTER_API_KEY environment variable is required');
}

// Initialize OpenAI client pointing to OpenRouter
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Client-side usage
});

// Using NVIDIA Nemotron Nano 9B v2 - a fast and efficient free model from OpenRouter
// This model provides better performance and reliability for construction estimation tasks
const MODEL = "nvidia/nemotron-nano-9b-v2:free";

// Rate limiting configuration
const MAX_RETRIES = 1;
const BASE_DELAY = 10000; // 10 seconds
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 15000; // 15 seconds between requests

// Helper to clean JSON if model returns markdown
const cleanJson = (text: string): string => {
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
};

// Safe JSON parser with fallback
const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = cleanJson(text);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.warn('JSON parse failed, using fallback:', error);
    return fallback;
  }
};

// Request queue to prevent concurrent API calls
const queueRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Waiting ${waitTime}ms to avoid rate limit...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return fn();
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

// Detailed Estimation
export const generateConstructionEstimate = async (inputs: ProjectInputs): Promise<EstimationResult> => {
  try {
    const prompt = `You are a construction cost estimator for ${inputs.location}. Use LOCAL currency and market rates.

${inputs.type} project in ${inputs.location}
- Size: ${inputs.sizeSqFt} sq ft
- Quality: ${inputs.quality} 
- Timeline: ${inputs.timelineMonths} months
- Workers: ${inputs.manpower}

IMPORTANT: Use the correct currency for ${inputs.location}:
- India (Mumbai, Delhi, etc): Use ₹ (INR) with rates like ₹2000-6000/sq ft
- USA: Use $ (USD) with rates like $100-300/sq ft
- UK: Use £ (GBP) with rates like £80-250/sq ft
- UAE (Dubai): Use AED with rates like 400-1200 AED/sq ft

Provide realistic ${inputs.location} market rates for ${inputs.quality} ${inputs.type} construction.

Return ONLY valid JSON:
{
  "currencySymbol": "₹" or "$" or "£" (based on location),
  "totalEstimatedCost": number (in local currency),
  "breakdown": [{"category": "string", "cost": number, "description": "string"}],
  "cashflow": [{"month": number, "amount": number, "phase": "string"}],
  "risks": [{"risk": "string", "impact": "Low|Medium|High", "mitigation": "string"}],
  "confidenceScore": number,
  "confidenceReason": "string", 
  "efficiencyTips": ["string"],
  "summary": "string"
}

Ensure cashflow has exactly ${inputs.timelineMonths} entries.`;

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
    return safeJsonParse(content, {
      currencySymbol: '$',
      totalEstimatedCost: 0,
      breakdown: [],
      cashflow: [],
      risks: [],
      confidenceScore: 0,
      confidenceReason: 'Unable to generate estimate',
      efficiencyTips: [],
      summary: 'Estimation failed - please try again'
    } as EstimationResult);
  } catch (error) {
    console.error("Estimation failed:", error instanceof Error ? error.message : 'Unknown error');
    const isRateLimit = error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'));
    
    if (isRateLimit) {
      // Detect currency and rates based on location
      const location = inputs.location.toLowerCase();
      let currency = '$';
      let rateMultiplier = 100; // USD base rate
      
      if (location.includes('mumbai') || location.includes('delhi') || location.includes('india')) {
        currency = '₹';
        rateMultiplier = 3500; // INR rate per sq ft
      } else if (location.includes('dubai') || location.includes('uae')) {
        currency = 'AED';
        rateMultiplier = 800;
      } else if (location.includes('london') || location.includes('uk')) {
        currency = '£';
        rateMultiplier = 150;
      }
      
      const qualityMultiplier = inputs.quality === 'Premium' ? 1.8 : inputs.quality === 'Standard' ? 1.2 : 0.8;
      const baseCost = inputs.sizeSqFt * rateMultiplier * qualityMultiplier;
      const laborCost = baseCost * 0.3;
      const materialCost = baseCost * 0.45;
      
      return {
        currencySymbol: currency,
        totalEstimatedCost: Math.round(baseCost),
        breakdown: [
          { category: 'Materials', cost: materialCost, description: 'Construction materials and supplies' },
          { category: 'Labor & Wages', cost: laborCost, description: `${inputs.manpower} workers for ${inputs.timelineMonths} months` },
          { category: 'Equipment', cost: baseCost * 0.1, description: 'Tools and equipment rental' },
          { category: 'Permits & Fees', cost: baseCost * 0.05, description: 'Building permits and regulatory fees' },
          { category: 'Contingency', cost: baseCost * 0.1, description: 'Unexpected costs buffer' }
        ],
        cashflow: Array.from({ length: inputs.timelineMonths }, (_, i) => {
          const month = i + 1;
          const progress = i / (inputs.timelineMonths - 1);
          let phase = '';
          let multiplier = 1;
          
          if (progress <= 0.1) {
            phase = 'Site Preparation & Permits';
            multiplier = 0.8;
          } else if (progress <= 0.3) {
            phase = 'Foundation & Excavation';
            multiplier = 1.2;
          } else if (progress <= 0.6) {
            phase = 'Structure & Framework';
            multiplier = 1.3;
          } else if (progress <= 0.8) {
            phase = 'MEP & Interior Work';
            multiplier = 1.1;
          } else {
            phase = 'Finishing & Handover';
            multiplier = 0.9;
          }
          
          return {
            month,
            amount: Math.round((baseCost / inputs.timelineMonths) * multiplier),
            phase
          };
        }),
        risks: [
          { risk: 'Weather delays', impact: ImpactLevel.MEDIUM, mitigation: 'Plan for seasonal weather patterns and maintain buffer time' },
          { risk: 'Material price fluctuation', impact: ImpactLevel.LOW, mitigation: 'Lock in material prices early and negotiate fixed-rate contracts' },
          { risk: 'Labor shortage', impact: ImpactLevel.HIGH, mitigation: 'Secure skilled workers in advance and maintain backup contractor list' },
          { risk: 'Permit delays', impact: ImpactLevel.MEDIUM, mitigation: 'Submit applications early and maintain regular follow-up with authorities' },
          { risk: 'Site access issues', impact: ImpactLevel.LOW, mitigation: 'Conduct thorough site survey and coordinate with local authorities' },
          { risk: 'Quality control failures', impact: ImpactLevel.HIGH, mitigation: 'Implement regular inspections and use certified materials only' }
        ],
        confidenceScore: 75,
        confidenceReason: 'Estimate based on standard industry rates (API unavailable)',
        efficiencyTips: [
          'Bulk purchase materials for 10-15% cost savings',
          'Schedule inspections in advance to avoid delays',
          'Use local suppliers to reduce transportation costs',
          'Implement just-in-time delivery to minimize storage costs',
          'Negotiate payment terms with suppliers for better cash flow',
          'Use standardized materials to reduce waste and complexity',
          'Plan work sequences to maximize crew efficiency',
          'Invest in quality tools to improve productivity',
          'Maintain detailed progress tracking to identify bottlenecks',
          'Consider prefabricated components for faster assembly'
        ],
        summary: `Estimated ${inputs.type} project cost for ${inputs.sizeSqFt} sq ft in ${inputs.location}`
      };
    }
    
    throw new Error('Failed to generate construction estimate. Please try again.');
  }
};

// Message interface for type safety
interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 3. Chat
export const sendChatMessage = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
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
        temperature: 0.7,
        stream: false
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
      // Provide helpful construction-related response when rate limited
      const lowerMessage = message.toLowerCase();
      
      // City-specific construction costs
      if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('budget')) {
        const cityData = {
          'hyderabad': 'Hyderabad: Basic ₹1400-2200/sq ft, Standard ₹2200-3800/sq ft, Premium ₹3800-7000/sq ft. HITEC City/Gachibowli areas are 15-20% higher.',
          'mumbai': 'Mumbai: Basic ₹2000-3000/sq ft, Standard ₹3000-5000/sq ft, Premium ₹5000-12000/sq ft. South Mumbai is significantly higher.',
          'delhi': 'Delhi: Basic ₹1800-2800/sq ft, Standard ₹2800-4500/sq ft, Premium ₹4500-10000/sq ft. Central Delhi costs more.',
          'bangalore': 'Bangalore: Basic ₹1600-2400/sq ft, Standard ₹2400-4000/sq ft, Premium ₹4000-8000/sq ft. Whitefield/Electronic City are premium.',
          'chennai': 'Chennai: Basic ₹1500-2300/sq ft, Standard ₹2300-3800/sq ft, Premium ₹3800-7500/sq ft. OMR corridor is costlier.',
          'pune': 'Pune: Basic ₹1400-2200/sq ft, Standard ₹2200-3600/sq ft, Premium ₹3600-7000/sq ft. Baner/Wakad areas are premium.',
          'kolkata': 'Kolkata: Basic ₹1200-2000/sq ft, Standard ₹2000-3200/sq ft, Premium ₹3200-6000/sq ft. Salt Lake/New Town are higher.',
          'ahmedabad': 'Ahmedabad: Basic ₹1300-2100/sq ft, Standard ₹2100-3400/sq ft, Premium ₹3400-6500/sq ft. SG Highway area is premium.',
          'jaipur': 'Jaipur: Basic ₹1200-1900/sq ft, Standard ₹1900-3100/sq ft, Premium ₹3100-6000/sq ft. Malviya Nagar/C-Scheme are costlier.',
          'lucknow': 'Lucknow: Basic ₹1100-1800/sq ft, Standard ₹1800-2900/sq ft, Premium ₹2900-5500/sq ft. Gomti Nagar is premium area.'
        };
        
        for (const [city, info] of Object.entries(cityData)) {
          if (lowerMessage.includes(city)) {
            return `Construction costs in ${info} Includes materials, labor, and basic finishes.`;
          }
        }
        
        return "Construction costs in India: Basic ₹1200-2500/sq ft, Standard ₹2500-4000/sq ft, Premium ₹4000-8000/sq ft. Metro cities are 20-40% higher. Use the estimator for precise city-specific rates.";
      }
      
      // Material costs
      if (lowerMessage.includes('material') || lowerMessage.includes('cement') || lowerMessage.includes('steel') || lowerMessage.includes('brick')) {
        return "Current material prices: Cement ₹350-450/bag (50kg), Steel TMT ₹55-65/kg, Bricks ₹8-12/piece, Sand ₹1500-2500/truck, Aggregate ₹1200-2000/truck, Paint ₹200-800/ltr. Prices vary by brand and location.";
      }
      
      // Timeline questions
      if (lowerMessage.includes('time') || lowerMessage.includes('duration') || lowerMessage.includes('schedule') || lowerMessage.includes('month')) {
        return "Construction timelines: 1000 sq ft = 4-6 months, 1500 sq ft = 5-7 months, 2000 sq ft = 6-8 months, 3000+ sq ft = 8-12 months. Factors: monsoon, permits, labor, complexity, and quality level.";
      }
      
      // Permit and legal
      if (lowerMessage.includes('permit') || lowerMessage.includes('approval') || lowerMessage.includes('legal') || lowerMessage.includes('noc')) {
        return "Building permits: 2-8 weeks processing. Documents needed: site plan, structural drawings, NOC from authorities. Costs: ₹50,000-2,00,000 based on project size. RERA registration required for projects >500 sq mt.";
      }
      
      // Labor and workforce
      if (lowerMessage.includes('labor') || lowerMessage.includes('worker') || lowerMessage.includes('contractor') || lowerMessage.includes('manpower')) {
        return "Labor costs: Skilled workers ₹800-1200/day, Semi-skilled ₹600-900/day, Unskilled ₹400-600/day. Contractor rates: ₹450-650/sq ft for complete construction. Rates vary by city and season.";
      }
      
      // Quality and specifications
      if (lowerMessage.includes('quality') || lowerMessage.includes('specification') || lowerMessage.includes('standard') || lowerMessage.includes('grade')) {
        return "Quality grades: Basic (local materials, simple finishes), Standard (branded materials, good finishes), Premium (high-end materials, luxury finishes). Each grade affects cost by 30-50%.";
      }
      
      // Loan and finance
      if (lowerMessage.includes('loan') || lowerMessage.includes('finance') || lowerMessage.includes('emi') || lowerMessage.includes('bank')) {
        return "Home construction loans: 80-90% financing available, 8-10% interest rates. Required: approved plan, land documents, cost estimates. EMI starts after construction begins. Processing fee: 0.5-1% of loan amount.";
      }
      
      return "I'm experiencing high API usage. I can help with construction costs for Indian cities, material prices, timelines, permits, labor rates, quality grades, and financing. Use the main estimator for detailed project analysis.";
    }
    
    return "I'm having trouble connecting right now. Please check your connection and try again, or use the main estimator tool for detailed project analysis.";
  }
};

// 4. Edit Site Image (Stub - not implemented)
export const editSiteImage = async (base64Data: string, prompt: string): Promise<string | null> => {
  console.warn("Image editing is not supported by the current model.");
  return null;
}
