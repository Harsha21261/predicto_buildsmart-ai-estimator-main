export const locationData = {
  "Mumbai, India": {
    currency: "CURRENCY: ₹ (Indian Rupees - INR)",
    rates: {
      Economy: "Rate Range: ₹2,000-3,000 per sq ft",
      Standard: "Rate Range: ₹3,000-5,000 per sq ft",
      Premium: "Rate Range: ₹5,000-8,000 per sq ft",
    },
    tips: [
      "Schedule concrete pours before 6 AM to avoid Mumbai's intense heat and traffic congestion",
      "Use monsoon-resistant materials and waterproofing during June-September rainy season",
      "Source materials from Navi Mumbai industrial area to reduce transportation costs by 15%",
    ],
    risks: [
        { risk: "Monsoon flooding disrupting construction for 60+ days during June-September", impact: "High", mitigation: "Plan critical phases outside monsoon season and invest in waterproof temporary structures" },
        { risk: "Mumbai's high real estate costs increasing material storage expenses by 200%", impact: "High", mitigation: "Use off-site storage in Navi Mumbai or Thane and implement just-in-time delivery" },
        { risk: "Traffic congestion causing 40% delays in material delivery", impact: "Medium", mitigation: "Schedule deliveries during off-peak hours (10 PM - 6 AM) and maintain buffer inventory" },
    ]
  },
  "Delhi, India": {
    currency: "CURRENCY: ₹ (Indian Rupees - INR)",
    rates: {
        Economy: "Rate Range: ₹2,000-3,000 per sq ft",
        Standard: "Rate Range: ₹3,000-5,000 per sq ft",
        Premium: "Rate Range: ₹5,000-8,000 per sq ft",
    },
    tips: [
        "Plan construction around Delhi's air pollution restrictions during winter months (Nov-Feb)",
        "Use dust suppression systems to comply with Delhi's strict environmental norms",
        "Source materials from Gurgaon industrial belt to optimize transportation costs",
    ],
    risks: [
        { risk: "Air pollution restrictions halting construction during winter smog season", impact: "High", mitigation: "Plan indoor work during high pollution days and invest in air filtration systems" },
        { risk: "Extreme temperature variations (-2°C to 48°C) affecting material quality", impact: "Medium", mitigation: "Use temperature-resistant materials and implement climate-controlled storage" },
    ]
  },
  "Bangalore, India": {
    currency: "CURRENCY: ₹ (Indian Rupees - INR)",
    rates: {
        Economy: "Rate Range: ₹2,000-3,000 per sq ft",
        Standard: "Rate Range: ₹3,000-5,000 per sq ft",
        Premium: "Rate Range: ₹5,000-8,000 per sq ft",
    },
    tips: [
        "Leverage Bangalore's tech-savvy workforce for implementing digital construction management tools",
        "Source skilled engineers from Bangalore's numerous engineering colleges for quality control",
        "Use Bangalore's pleasant climate for year-round construction with minimal weather delays",
    ],
    risks: [
        { risk: "Skilled labor shortage in tech hub driving construction wages 30% higher", impact: "High", mitigation: "Secure workforce early with competitive packages and partner with local training institutes" },
        { risk: "Water scarcity during summer months affecting construction activities", impact: "Medium", mitigation: "Install water storage systems and coordinate with Bangalore Water Supply Board" },
    ]
  },
  "Dubai, UAE": {
    currency: "CURRENCY: AED (UAE Dirhams)",
    rates: {
      Economy: "Rate Range: 500-750 AED per sq ft",
      Standard: "Rate Range: 750-1,200 AED per sq ft",
      Premium: "Rate Range: 1,200-2,000 AED per sq ft",
    },
    tips: [
      "Schedule outdoor construction work between 6 AM - 10 AM during Dubai's summer months (May-Sept)",
      "Use Dubai's free zones for duty-free material imports and equipment sourcing",
    ],
    risks: [
        { risk: "Extreme summer heat (45°C+) reducing outdoor productivity by 60% for 5 months", impact: "High", mitigation: "Shift to night work schedules and invest in climate-controlled work environments" },
        { risk: "Sandstorms disrupting construction and damaging equipment during summer months", impact: "Medium", mitigation: "Use protective covers for equipment and plan indoor work during sandstorm seasons" },
    ]
  },
  "London, UK": {
    currency: "CURRENCY: £ (British Pounds - GBP)",
    rates: {
      Economy: "Rate Range: £100-150 per sq ft",
      Standard: "Rate Range: £150-250 per sq ft",
      Premium: "Rate Range: £250-400 per sq ft",
    },
    tips: [
        "Plan for 40% additional time during London's winter months due to frequent rain delays",
        "Use London's extensive rail network for efficient material transportation within the city",
    ],
    risks: [
        { risk: "Frequent rain delays extending construction timeline by 25% annually", impact: "High", mitigation: "Invest in weather protection systems and plan flexible indoor work schedules" },
        { risk: "Brexit-related material import delays and cost increases of 15-20%", impact: "Medium", mitigation: "Use UK suppliers where possible and plan longer lead times for EU materials" },
    ]
  },
  "New York, USA": {
    currency: "CURRENCY: $ (US Dollars - USD)",
    rates: {
      Economy: "Rate Range: $120-180 per sq ft",
      Standard: "Rate Range: $180-280 per sq ft",
      Premium: "Rate Range: $280-450 per sq ft",
    },
    tips: [
        "Navigate New York's complex union labor requirements by partnering with established local contractors",
        "Use New York's extensive subway system for efficient material transportation to avoid traffic",
    ],
    risks: [
        { risk: "Union labor requirements increasing costs by 25-30% above national average", impact: "High", mitigation: "Budget for union wages and negotiate long-term agreements with established local unions" },
        { risk: "Harsh winter conditions halting outdoor work for 3-4 months annually", impact: "High", mitigation: "Plan indoor work during winter and invest in heated temporary structures" },
    ]
  },
  "Toronto, Canada": {
    currency: "CURRENCY: CAD $ (Canadian Dollars)",
    rates: {
        Economy: "Rate Range: CAD $140-200 per sq ft",
        Standard: "Rate Range: CAD $200-320 per sq ft",
        Premium: "Rate Range: CAD $320-500 per sq ft",
    }
  },
  "Sydney, Australia": {
    currency: "CURRENCY: AUD $ (Australian Dollars)",
    rates: {
        Economy: "Rate Range: AUD $1,800-2,500 per sq m",
        Standard: "Rate Range: AUD $2,500-3,800 per sq m",
        Premium: "Rate Range: AUD $3,800-6,000 per sq m",
    }
  },
  "Singapore": {
    currency: "CURRENCY: SGD $ (Singapore Dollars)",
    rates: {
        Economy: "Rate Range: SGD $800-1,200 per sq m",
        Standard: "Rate Range: SGD $1,200-2,000 per sq m",
        Premium: "Rate Range: SGD $2,000-3,500 per sq m",
    }
  },
  "Tokyo, Japan": {
    currency: "CURRENCY: ¥ (Japanese Yen - JPY)",
    rates: {
        Economy: "Rate Range: ¥180,000-250,000 per sq m",
        Standard: "Rate Range: ¥250,000-400,000 per sq m",
        Premium: "Rate Range: ¥400,000-650,000 per sq m",
    }
  },
  "Berlin, Germany": {
    currency: "CURRENCY: € (Euros - EUR)",
    rates: {
        Economy: "Rate Range: €1,200-1,800 per sq m",
        Standard: "Rate Range: €1,800-2,800 per sq m",
        Premium: "Rate Range: €2,800-4,500 per sq m",
    }
  },
  "fallback": {
    currency: "CURRENCY: $ (US Dollars - USD)",
    rates: {
        Economy: 'Rate Range: $120-180 per sq ft',
        Standard: 'Rate Range: $180-280 per sq ft',
        Premium: 'Rate Range: $280-450 per sq ft',
    },
    tips: [
      "Research local building codes and permit requirements early",
      "Consider climate patterns for optimal construction timing",
      "Source materials from local suppliers to reduce transportation costs",
    ],
    risks: [
      { risk: "Local regulatory compliance challenges", impact: "Medium", mitigation: "Engage local experts familiar with regulations" },
      { risk: "Weather-related delays specific to the climate", impact: "Medium", mitigation: "Plan construction schedule around seasonal patterns" },
    ]
  }
};
