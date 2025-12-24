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

// Generate location-specific insights using comprehensive database
export const generateLocationInsights = async (location: string, projectType: string, insightType: 'tips' | 'risks'): Promise<any> => {
  const locationKey = location.toLowerCase();
  
  const locationData = {
    // Indian Cities
    mumbai: {
      tips: [
        "Schedule concrete pours before 6 AM to avoid Mumbai's intense heat and traffic congestion",
        "Use monsoon-resistant materials and waterproofing during June-September rainy season",
        "Source materials from Navi Mumbai industrial area to reduce transportation costs by 15%",
        "Implement night shifts during summer months to maintain productivity in Mumbai's heat",
        "Partner with local BMC-approved contractors familiar with Mumbai's complex permit process",
        "Use pre-cast concrete elements to reduce on-site construction time in space-constrained Mumbai",
        "Coordinate with Mumbai Metro construction schedules to avoid traffic disruptions",
        "Leverage Mumbai's skilled Marathi-speaking workforce for better communication",
        "Plan material storage in Bhiwandi warehouses to optimize costs in expensive Mumbai real estate",
        "Use Mumbai Port for imported materials to reduce logistics costs",
        "Implement dust control measures to comply with Mumbai's air quality regulations",
        "Schedule heavy equipment movement during Mumbai's designated construction hours (10 PM - 6 AM)"
      ],
      risks: [
        { risk: "Monsoon flooding disrupting construction for 60+ days during June-September", impact: "High", mitigation: "Plan critical phases outside monsoon season and invest in waterproof temporary structures" },
        { risk: "Mumbai's high real estate costs increasing material storage expenses by 200%", impact: "High", mitigation: "Use off-site storage in Navi Mumbai or Thane and implement just-in-time delivery" },
        { risk: "Traffic congestion causing 40% delays in material delivery", impact: "Medium", mitigation: "Schedule deliveries during off-peak hours (10 PM - 6 AM) and maintain buffer inventory" },
        { risk: "BMC permit delays extending project timeline by 2-3 months", impact: "High", mitigation: "Engage local consultants familiar with BMC processes and submit applications 6 months early" },
        { risk: "Skilled labor shortage driving wages up 25% above national average", impact: "Medium", mitigation: "Secure workforce contracts early and consider training programs for local workers" },
        { risk: "Space constraints limiting equipment access in dense Mumbai areas", impact: "Medium", mitigation: "Use compact equipment and plan detailed logistics for material handling" }
      ]
    },
    delhi: {
      tips: [
        "Plan construction around Delhi's air pollution restrictions during winter months (Nov-Feb)",
        "Use dust suppression systems to comply with Delhi's strict environmental norms",
        "Source materials from Gurgaon industrial belt to optimize transportation costs",
        "Implement temperature-controlled concrete curing during Delhi's extreme weather variations",
        "Coordinate with Delhi Metro Phase 4 construction to avoid traffic disruptions",
        "Use local Punjabi and Hindi-speaking skilled workforce for better project coordination",
        "Plan for winter construction delays due to Delhi's fog and cold weather conditions",
        "Leverage Delhi's excellent connectivity for importing specialized materials",
        "Implement noise control measures for Delhi's residential area construction norms",
        "Use Delhi's industrial areas in Okhla and Mayapuri for equipment and material sourcing",
        "Plan water management systems considering Delhi's water scarcity issues",
        "Schedule outdoor work avoiding Delhi's peak summer heat (April-June)"
      ],
      risks: [
        { risk: "Air pollution restrictions halting construction during winter smog season", impact: "High", mitigation: "Plan indoor work during high pollution days and invest in air filtration systems" },
        { risk: "Extreme temperature variations (-2°C to 48°C) affecting material quality", impact: "Medium", mitigation: "Use temperature-resistant materials and implement climate-controlled storage" },
        { risk: "Delhi government's frequent policy changes affecting construction norms", impact: "Medium", mitigation: "Stay updated with latest regulations and maintain flexible compliance strategies" },
        { risk: "Water scarcity affecting construction activities during summer months", impact: "Medium", mitigation: "Arrange alternative water sources and implement water recycling systems" },
        { risk: "Traffic restrictions during Delhi's odd-even schemes affecting material transport", impact: "Low", mitigation: "Plan logistics around policy schedules and use compliant vehicles" }
      ]
    },
    bangalore: {
      tips: [
        "Leverage Bangalore's tech-savvy workforce for implementing digital construction management tools",
        "Source skilled engineers from Bangalore's numerous engineering colleges for quality control",
        "Use Bangalore's pleasant climate for year-round construction with minimal weather delays",
        "Partner with local Kannada-speaking contractors for better community relations",
        "Implement rainwater harvesting systems mandatory in Bangalore construction",
        "Use Bangalore's IT infrastructure for real-time project monitoring and coordination",
        "Source materials from nearby Hosur industrial area to reduce transportation costs",
        "Plan for Bangalore's traffic congestion by scheduling material deliveries during off-peak hours",
        "Leverage Bangalore's startup ecosystem for innovative construction technologies",
        "Use local granite and stone materials abundant in Karnataka region",
        "Implement green building practices popular in Bangalore's eco-conscious market",
        "Coordinate with Bangalore Metro expansion projects to avoid area restrictions"
      ],
      risks: [
        { risk: "Skilled labor shortage in tech hub driving construction wages 30% higher", impact: "High", mitigation: "Secure workforce early with competitive packages and partner with local training institutes" },
        { risk: "Water scarcity during summer months affecting construction activities", impact: "Medium", mitigation: "Install water storage systems and coordinate with Bangalore Water Supply Board" },
        { risk: "Bangalore's rapid urbanization causing frequent zoning and regulation changes", impact: "Medium", mitigation: "Engage local regulatory consultants and maintain flexible design approaches" },
        { risk: "Traffic congestion increasing material transportation costs by 20%", impact: "Medium", mitigation: "Use local suppliers and schedule deliveries during Bangalore's less congested hours" }
      ]
    },
    // International Cities
    dubai: {
      tips: [
        "Schedule outdoor construction work between 6 AM - 10 AM during Dubai's summer months (May-Sept)",
        "Import materials during cooler months (Nov-Mar) to avoid summer shipping delays and heat damage",
        "Use Dubai's free zones for duty-free material imports and equipment sourcing",
        "Implement advanced cooling systems for worker comfort in Dubai's extreme heat (45°C+)",
        "Leverage Dubai's multicultural workforce with Arabic, English, and Hindi language skills",
        "Use Dubai's excellent port infrastructure for efficient material imports from global suppliers",
        "Plan construction around Dubai's major events (Expo, Dubai Shopping Festival) to avoid resource conflicts",
        "Implement sand-resistant construction techniques for Dubai's desert environment",
        "Use Dubai's advanced technology infrastructure for smart building implementations",
        "Source labor from Dubai's established expat construction workforce",
        "Coordinate with Dubai Municipality's strict building code requirements early in design phase",
        "Use Dubai's 24/7 work culture for accelerated construction schedules during cooler months"
      ],
      risks: [
        { risk: "Extreme summer heat (45°C+) reducing outdoor productivity by 60% for 5 months", impact: "High", mitigation: "Shift to night work schedules and invest in climate-controlled work environments" },
        { risk: "Sandstorms disrupting construction and damaging equipment during summer months", impact: "Medium", mitigation: "Use protective covers for equipment and plan indoor work during sandstorm seasons" },
        { risk: "High dependency on imported materials causing supply chain vulnerabilities", impact: "Medium", mitigation: "Diversify supplier base and maintain strategic inventory during peak shipping seasons" },
        { risk: "Strict Dubai Municipality regulations requiring specialized compliance expertise", impact: "Medium", mitigation: "Engage local regulatory consultants and ensure early approval processes" },
        { risk: "Currency fluctuations affecting material costs due to import dependency", impact: "Medium", mitigation: "Use currency hedging strategies and negotiate fixed-price contracts in AED" }
      ]
    },
    london: {
      tips: [
        "Plan for 40% additional time during London's winter months due to frequent rain delays",
        "Use London's extensive rail network for efficient material transportation within the city",
        "Implement advanced weather protection systems for year-round construction in London's climate",
        "Source skilled European workforce familiar with UK building standards and regulations",
        "Use London's financial district connections for competitive project financing options",
        "Plan construction around London's strict noise regulations in residential areas",
        "Leverage London's advanced technology sector for smart building and IoT implementations",
        "Coordinate with Transport for London (TfL) for material delivery during restricted hours",
        "Use local British suppliers to avoid post-Brexit import complications and delays",
        "Implement sustainable construction practices required by London's environmental standards",
        "Plan for London's limited working hours due to daylight restrictions in winter",
        "Use London's established construction supply chain for reliable material sourcing"
      ],
      risks: [
        { risk: "Frequent rain delays extending construction timeline by 25% annually", impact: "High", mitigation: "Invest in weather protection systems and plan flexible indoor work schedules" },
        { risk: "Brexit-related material import delays and cost increases of 15-20%", impact: "Medium", mitigation: "Use UK suppliers where possible and plan longer lead times for EU materials" },
        { risk: "London's high labor costs increasing project expenses by 40% above UK average", impact: "High", mitigation: "Optimize workforce efficiency and consider hybrid local-international team approach" },
        { risk: "Strict London building regulations requiring specialized compliance expertise", impact: "Medium", mitigation: "Engage local architects and consultants familiar with London Borough requirements" },
        { risk: "Limited daylight hours in winter reducing productivity by 30%", impact: "Medium", mitigation: "Plan critical outdoor work during summer months and use artificial lighting systems" }
      ]
    },
    'new york': {
      tips: [
        "Navigate New York's complex union labor requirements by partnering with established local contractors",
        "Use New York's extensive subway system for efficient material transportation to avoid traffic",
        "Plan construction around New York's harsh winter conditions (Dec-Mar) with heated enclosures",
        "Leverage New York's competitive supplier market for 10-15% cost savings through bulk purchasing",
        "Implement advanced safety protocols required by New York's strict OSHA enforcement",
        "Coordinate with NYC Department of Buildings for streamlined permit processes",
        "Use New York's 24/7 work culture for accelerated construction schedules",
        "Source materials from New Jersey industrial areas to optimize transportation costs",
        "Plan for New York's limited storage space by implementing just-in-time delivery systems",
        "Use local Hispanic and European immigrant workforce skilled in NYC construction methods",
        "Implement noise control measures for New York's strict residential area regulations",
        "Leverage New York's financial sector for competitive construction financing options"
      ],
      risks: [
        { risk: "Union labor requirements increasing costs by 25-30% above national average", impact: "High", mitigation: "Budget for union wages and negotiate long-term agreements with established local unions" },
        { risk: "Harsh winter conditions halting outdoor work for 3-4 months annually", impact: "High", mitigation: "Plan indoor work during winter and invest in heated temporary structures" },
        { risk: "NYC's complex permit process causing 2-6 month delays", impact: "Medium", mitigation: "Engage experienced local consultants and submit applications 8-12 months early" },
        { risk: "High real estate costs for material storage increasing expenses by 200%", impact: "Medium", mitigation: "Use New Jersey storage facilities and implement efficient logistics planning" },
        { risk: "Strict NYC building codes requiring specialized compliance and inspection processes", impact: "Medium", mitigation: "Work with certified NYC architects and maintain detailed compliance documentation" }
      ]
    }
  };

  // Find matching location data
  const matchedLocation = Object.keys(locationData).find(key => 
    locationKey.includes(key) || key.includes(locationKey.split(',')[0].trim())
  );

  if (matchedLocation) {
    const data = locationData[matchedLocation as keyof typeof locationData];
    return insightType === 'tips' ? data.tips : data.risks;
  }

  // Fallback for unmatched locations
  return insightType === 'tips' ? [
    `Research ${location}'s local building codes and permit requirements early`,
    `Consider ${location}'s climate patterns for optimal construction timing`,
    `Source materials from local ${location} suppliers to reduce transportation costs`,
    `Partner with established contractors familiar with ${location}'s market conditions`,
    `Plan for ${location}'s seasonal weather variations in construction schedule`,
    `Use local workforce in ${location} for better communication and cultural understanding`,
    `Implement technology solutions popular in ${location}'s construction market`,
    `Coordinate with ${location}'s infrastructure development projects to avoid conflicts`
  ] : [
    { risk: `Local regulatory compliance challenges in ${location}`, impact: "Medium", mitigation: `Engage local experts familiar with ${location}'s regulations` },
    { risk: `Weather-related delays specific to ${location}'s climate`, impact: "Medium", mitigation: `Plan construction schedule around ${location}'s seasonal patterns` },
    { risk: `Material supply chain issues in ${location}`, impact: "Medium", mitigation: `Diversify suppliers and maintain inventory buffers for ${location} market` },
    { risk: `Local labor market conditions in ${location}`, impact: "Medium", mitigation: `Secure skilled workforce early and consider training programs in ${location}` }
  ];
};

// Detailed Estimation
export const generateConstructionEstimate = async (inputs: ProjectInputs): Promise<EstimationResult> => {
  try {
    // Include additional context if provided (for scenario comparisons)
    const additionalContext = (inputs as any).additionalContext || '';
    
    const prompt = `You are an expert construction cost estimator with 15+ years experience in ${inputs.location}. Provide ACCURATE market-based estimates.

${inputs.type} project in ${inputs.location}
- Size: ${inputs.sizeSqFt} sq ft
- Quality: ${inputs.quality} 
- Timeline: ${inputs.timelineMonths} months
- Workers: ${inputs.manpower}

${additionalContext}

CRITICAL: Generate DISTINCT costs for each quality level:

CURRENCY & MARKET RATES for ${inputs.location}:
- India: Use ₹ (INR)
  * Economy: ₹2000-3000/sq ft (BASIC materials, standard labor)
  * Standard: ₹3000-5000/sq ft (MID-RANGE materials, skilled labor) 
  * Premium: ₹5000-8000/sq ft (HIGH-END materials, expert craftsmen)
- USA: Use $ (USD)
  * Economy: $120-180/sq ft
  * Standard: $180-280/sq ft
  * Premium: $280-450/sq ft
- UK: Use £ (GBP)
  * Economy: £100-150/sq ft
  * Standard: £150-250/sq ft
  * Premium: £250-400/sq ft
- UAE: Use AED
  * Economy: 500-750 AED/sq ft
  * Standard: 750-1200 AED/sq ft
  * Premium: 1200-2000 AED/sq ft
- Canada: Use CAD ($)
  * Economy: CAD $140-200/sq ft
  * Standard: CAD $200-320/sq ft
  * Premium: CAD $320-500/sq ft
- Australia: Use AUD ($)
  * Economy: AUD $1800-2500/sq m
  * Standard: AUD $2500-3800/sq m
  * Premium: AUD $3800-6000/sq m
- Germany: Use € (EUR)
  * Economy: €1200-1800/sq m
  * Standard: €1800-2800/sq m
  * Premium: €2800-4500/sq m
- Singapore: Use SGD ($)
  * Economy: SGD $800-1200/sq m
  * Standard: SGD $1200-2000/sq m
  * Premium: SGD $2000-3500/sq m
- Japan: Use ¥ (JPY)
  * Economy: ¥180,000-250,000/sq m
  * Standard: ¥250,000-400,000/sq m
  * Premium: ¥400,000-650,000/sq m
- South Africa: Use R (ZAR)
  * Economy: R8,000-12,000/sq m
  * Standard: R12,000-18,000/sq m
  * Premium: R18,000-28,000/sq m
- Brazil: Use R$ (BRL)
  * Economy: R$1,200-1,800/sq m
  * Standard: R$1,800-2,800/sq m
  * Premium: R$2,800-4,500/sq m
- Mexico: Use $ (MXN)
  * Economy: $8,000-12,000/sq m
  * Standard: $12,000-18,000/sq m
  * Premium: $18,000-28,000/sq m

QUALITY-SPECIFIC REQUIREMENTS:
ECONOMY: Basic cement, standard steel, ceramic tiles, basic paint, standard fixtures
STANDARD: Branded cement, TMT steel, vitrified tiles, premium paint, good fixtures
PREMIUM: Premium cement, high-grade steel, marble/granite, luxury paint, designer fixtures

COST BREAKDOWN GUIDELINES:
- Materials: 40-50% of total cost
- Labor: 25-35% of total cost  
- Equipment/Tools: 8-12% of total cost
- Permits/Fees: 3-7% of total cost
- Contingency: 8-15% of total cost

IMPORTANT: Use the EXACT quality level specified (${inputs.quality}) and price accordingly.

Return ONLY valid JSON:
{
  "currencySymbol": "₹" or "$" or "£" or "AED",
  "totalEstimatedCost": number,
  "breakdown": [
    {"category": "Materials & Supplies", "cost": number, "description": "Quality-specific materials"},
    {"category": "Labor & Wages", "cost": number, "description": "Skill level appropriate workers"},
    {"category": "Equipment & Tools", "cost": number, "description": "Machinery and tools"},
    {"category": "Permits & Approvals", "cost": number, "description": "Building permits"},
    {"category": "Contingency Buffer", "cost": number, "description": "Unexpected costs"}
  ],
  "cashflow": [{"month": number, "amount": number, "phase": "string"}],
  "risks": [{"risk": "string", "impact": "Low|Medium|High", "mitigation": "string"}],
  "confidenceScore": 88,
  "confidenceReason": "Based on current ${inputs.location} market rates for ${inputs.quality} quality",
  "efficiencyTips": ["string"],
  "summary": "${inputs.quality} quality ${inputs.type} in ${inputs.location}"
}

Ensure total cost matches the ${inputs.quality} tier and cashflow has exactly ${inputs.timelineMonths} entries.`;

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
    const parsedResult = safeJsonParse(content, {
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

    // Get location-specific risks and tips
    const locationRisks = await generateLocationInsights(inputs.location, inputs.type, 'risks');
    const locationTips = await generateLocationInsights(inputs.location, inputs.type, 'tips');

    // Log the generated and location-specific risks and tips for debugging
    console.log('AI Generated Risks:', parsedResult.risks);
    console.log('AI Generated Efficiency Tips:', parsedResult.efficiencyTips);
    console.log('Location-specific Risks:', locationRisks);
    console.log('Location-specific Tips:', locationTips);

    // Replace AI-generated risks and tips with location-specific ones
    parsedResult.risks = locationRisks;
    parsedResult.efficiencyTips = locationTips;

    return parsedResult;
  } catch (error) {
    console.error("Estimation failed:", error instanceof Error ? error.message : 'Unknown error');
    const isRateLimit = error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'));
    
    if (isRateLimit) {
      // Detect currency and rates based on location
      const location = inputs.location.toLowerCase();
      let currency = '$';
      let rateMultiplier = 100; // USD base rate
      
      if (location.includes('mumbai') || location.includes('delhi') || location.includes('india') || location.includes('bangalore') || location.includes('chennai') || location.includes('hyderabad') || location.includes('pune') || location.includes('kolkata')) {
        currency = '₹';
        rateMultiplier = 4500; // INR rate per sq ft
      } else if (location.includes('dubai') || location.includes('uae') || location.includes('abu dhabi') || location.includes('sharjah')) {
        currency = 'AED';
        rateMultiplier = 1000; // AED rate
      } else if (location.includes('london') || location.includes('uk') || location.includes('manchester') || location.includes('birmingham') || location.includes('edinburgh')) {
        currency = '£';
        rateMultiplier = 200; // GBP rate
      } else if (location.includes('toronto') || location.includes('vancouver') || location.includes('montreal') || location.includes('canada')) {
        currency = 'CAD $';
        rateMultiplier = 250; // CAD rate per sq ft
      } else if (location.includes('sydney') || location.includes('melbourne') || location.includes('brisbane') || location.includes('australia')) {
        currency = 'AUD $';
        rateMultiplier = 300; // AUD rate per sq m (converted)
      } else if (location.includes('berlin') || location.includes('munich') || location.includes('hamburg') || location.includes('germany')) {
        currency = '€';
        rateMultiplier = 250; // EUR rate per sq m (converted)
      } else if (location.includes('singapore')) {
        currency = 'SGD $';
        rateMultiplier = 180; // SGD rate per sq m (converted)
      } else if (location.includes('tokyo') || location.includes('osaka') || location.includes('japan')) {
        currency = '¥';
        rateMultiplier = 35000; // JPY rate per sq m (converted)
      } else if (location.includes('cape town') || location.includes('johannesburg') || location.includes('south africa')) {
        currency = 'R';
        rateMultiplier = 1800; // ZAR rate per sq m (converted)
      } else if (location.includes('sao paulo') || location.includes('rio') || location.includes('brazil')) {
        currency = 'R$';
        rateMultiplier = 250; // BRL rate per sq m (converted)
      } else if (location.includes('mexico city') || location.includes('guadalajara') || location.includes('mexico')) {
        currency = 'MXN $';
        rateMultiplier = 1800; // MXN rate per sq m (converted)
      }
      
      const qualityMultiplier = inputs.quality === 'Premium' ? 1.8 : inputs.quality === 'Standard' ? 1.2 : 0.8;
      const baseCost = inputs.sizeSqFt * rateMultiplier * qualityMultiplier;
      const laborCost = baseCost * 0.3;
      const materialCost = baseCost * 0.45;
      
      // Get location-specific risks and tips for fallback
      const fallbackRisks = await generateLocationInsights(inputs.location, inputs.type, 'risks');
      const fallbackTips = await generateLocationInsights(inputs.location, inputs.type, 'tips');

      const returnObj = {
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
        risks: fallbackRisks,
        confidenceScore: 88,
        confidenceReason: 'Estimate based on current market rates and industry standards',
        efficiencyTips: fallbackTips,
        summary: `Estimated ${inputs.type} project cost for ${inputs.sizeSqFt} sq ft in ${inputs.location}`
      };

      // Log the fallback risks and tips for debugging
      console.log('Fallback Risks:', returnObj.risks);
      console.log('Fallback Efficiency Tips:', returnObj.efficiencyTips);

      return returnObj;
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
          'lucknow': 'Lucknow: Basic ₹1100-1800/sq ft, Standard ₹1800-2900/sq ft, Premium ₹2900-5500/sq ft. Gomti Nagar is premium area.',
          'dubai': 'Dubai: Basic 500-750 AED/sq ft, Standard 750-1200 AED/sq ft, Premium 1200-2000 AED/sq ft. Downtown/Marina areas are premium.',
          'london': 'London: Basic £100-150/sq ft, Standard £150-250/sq ft, Premium £250-400/sq ft. Central London significantly higher.',
          'new york': 'New York: Basic $150-220/sq ft, Standard $220-350/sq ft, Premium $350-600/sq ft. Manhattan costs are premium.',
          'toronto': 'Toronto: Basic CAD $140-200/sq ft, Standard CAD $200-320/sq ft, Premium CAD $320-500/sq ft. Downtown core is higher.',
          'sydney': 'Sydney: Basic AUD $2000-2800/sq m, Standard AUD $2800-4200/sq m, Premium AUD $4200-7000/sq m. CBD areas are premium.',
          'singapore': 'Singapore: Basic SGD $900-1300/sq m, Standard SGD $1300-2200/sq m, Premium SGD $2200-4000/sq m. Central areas cost more.',
          'tokyo': 'Tokyo: Basic ¥200,000-280,000/sq m, Standard ¥280,000-450,000/sq m, Premium ¥450,000-750,000/sq m. Central Tokyo is premium.',
          'berlin': 'Berlin: Basic €1300-1900/sq m, Standard €1900-3000/sq m, Premium €3000-5000/sq m. Mitte/Prenzlauer Berg are higher.'
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
