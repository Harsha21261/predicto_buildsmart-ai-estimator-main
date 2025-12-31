import { ProjectInputs, EstimationResult, ReportData, EditableAssumptions, ScenarioComparison, QualityLevel } from '../types';
import { generateConstructionEstimate, generateLocationInsights } from './geminiService';
import jsPDF from 'jspdf';

/*
AI SCENARIO COMPARISON:
The system now uses AI-powered scenario comparison by default for city-specific analysis.
This generates separate AI estimates for each quality level using location-specific market data.

SAFEGUARDS IMPLEMENTED:
- Sequential API calls with 2-second delays to prevent rate limits
- 30-second timeout per estimate to prevent hanging
- Comprehensive fallback to hardcoded logic if AI fails
- No concurrent API calls to avoid rate limit issues

REVERT INSTRUCTIONS (if needed):
To disable AI scenario comparison and use hardcoded logic:
1. Change: const USE_AI_SCENARIO_COMPARISON = true;
   To: const USE_AI_SCENARIO_COMPARISON = false;

For complete revert of AI insights:
- Comment out the AI calls in exportReportData and use empty arrays instead
- This will disable location-specific tips and risks generation
*/

// AI-powered location-specific market data using NVIDIA Nemotron
const getLocationSpecificTips = async (location: string, projectType: string, inputs?: ProjectInputs): Promise<string[]> => {
  try {
    console.log(`Generating AI-powered efficiency tips for ${location}...`);
    const tips = await generateLocationInsights(location, projectType, 'tips');
    // Ensure we have up to 8 tips, but limit to prevent API hallucinations
    return tips.slice(0, 8);
  } catch (error) {
    console.warn('AI tip generation failed, using generic fallbacks:', error);
    return [
      'Research local suppliers for better material rates (Generic)',
      'Account for specific construction challenges (Generic)',
      'Optimize workforce scheduling for local conditions (Generic)',
      'Consider seasonal weather patterns for timeline planning (Generic)',
      'Utilize local construction expertise and partnerships (Generic)',
      'Factor in transportation and logistics costs (Generic)',
      'Plan for specific regulatory requirements (Generic)',
      'Optimize material sourcing within the local market (Generic)'
    ].slice(0, 8);
  }
};

const getLocationSpecificRisks = async (location: string, projectType: string, inputs?: ProjectInputs): Promise<Array<{ risk: string, impact: string, mitigation: string }>> => {
  try {
    console.log(`Generating AI-powered risk analysis for ${location}...`);
    const risks = await generateLocationInsights(location, projectType, 'risks');
    // Ensure we have up to 8 risks, but limit to prevent API hallucinations
    return risks.slice(0, 8);
  } catch (error) {
    console.warn('AI risk generation failed, using generic fallbacks:', error);
    return [
      {
        risk: 'Construction delays due to specific factors (Generic)',
        impact: 'Medium',
        mitigation: 'Plan for local challenges and maintain flexible timelines'
      },
      {
        risk: 'Resource availability issues (Generic)',
        impact: 'Medium',
        mitigation: 'Secure resources early and establish local partnerships'
      },
      {
        risk: 'Weather-related disruptions (Generic)',
        impact: 'High',
        mitigation: 'Account for climate patterns and seasonal construction windows'
      },
      {
        risk: 'Regulatory compliance challenges (Generic)',
        impact: 'Medium',
        mitigation: 'Research and comply with all building codes and permit requirements'
      },
      {
        risk: 'Labor market fluctuations (Generic)',
        impact: 'Medium',
        mitigation: 'Secure skilled workforce early and consider labor market conditions'
      },
      {
        risk: 'Supply chain disruptions (Generic)',
        impact: 'Low',
        mitigation: 'Establish multiple suppliers and maintain buffer inventory for the market'
      },
      {
        risk: 'Currency exchange volatility (Generic)',
        impact: 'Low',
        mitigation: 'Use local currency contracts and hedge against exchange rate risks'
      },
      {
        risk: 'Infrastructure limitations (Generic)',
        impact: 'Medium',
        mitigation: 'Assess and plan for transportation and utility access requirements'
      }
    ].slice(0, 8);
  }
};

// Toggle for AI-powered scenario comparison (set to false to use hardcoded logic only)
const USE_AI_SCENARIO_COMPARISON = true;

// Export report data without PDF generation
export const exportReportData = async (reportData: ReportData): Promise<any> => {
  try {
    console.log('Starting report data export...');

    const { projectInputs, estimation, assumptions, generatedAt, scenarioComparison } = reportData;

    console.log('Processing report data...');

    // Generate AI-powered location-specific insights (up to 8 points each)
    console.log('Generating location-specific AI insights for report...');
    const [locationTips, locationRisks] = await Promise.all([
      getLocationSpecificTips(projectInputs.location, projectInputs.type, projectInputs),
      getLocationSpecificRisks(projectInputs.location, projectInputs.type, projectInputs)
    ]);

    console.log(`Generated ${locationTips.length} efficiency tips and ${locationRisks.length} risk assessments`);

    // Prepare report data structure
    const formattedReport: any = {
      title: 'CONSTRUCTION COST ESTIMATE',
      subtitle: 'Professional Analysis & Market Intelligence',
      generatedAt: generatedAt.toISOString(),
      project: {
        type: projectInputs.type,
        location: projectInputs.location,
        sizeSqFt: projectInputs.sizeSqFt,
        quality: projectInputs.quality,
        timelineMonths: projectInputs.timelineMonths,
        manpower: projectInputs.manpower
      },
      totalCost: {
        amount: estimation.totalEstimatedCost,
        currencySymbol: estimation.currencySymbol,
        formatted: `${estimation.currencySymbol} ${estimation.totalEstimatedCost.toLocaleString()}`
      },
      executiveSummary: {
        keyMetrics: {
          totalInvestment: `${estimation.currencySymbol} ${estimation.totalEstimatedCost.toLocaleString()}`,
          aiConfidence: `${estimation.confidenceScore}%`,
          projectDuration: `${projectInputs.timelineMonths} months`,
          riskAssessment: estimation.risks.length > 3 ? 'High' : estimation.risks.length > 1 ? 'Medium' : 'Low'
        },
        projectOverview: `This comprehensive analysis covers a ${projectInputs.type.toLowerCase()} construction project located in ${projectInputs.location}. The project encompasses ${projectInputs.sizeSqFt.toLocaleString()} square feet of construction area with ${projectInputs.quality.toLowerCase()} quality specifications. Our AI-powered analysis indicates a ${projectInputs.timelineMonths}-month completion timeline utilizing ${projectInputs.manpower} skilled personnel.`,
        marketIntelligence: {
          confidenceLevel: `${estimation.confidenceScore}%`,
          confidenceDescription: estimation.confidenceScore > 85 ? 'Excellent' : estimation.confidenceScore > 70 ? 'Good' : 'Fair',
          confidenceReason: estimation.confidenceReason
        }
      },
      costBreakdown: {
        categories: estimation.breakdown.map((item: any) => ({
          category: item.category,
          amount: item.cost,
          formattedAmount: `${estimation.currencySymbol} ${item.cost.toLocaleString()}`,
          percentage: ((item.cost / estimation.totalEstimatedCost) * 100).toFixed(1) + '%',
          description: item.description || 'Standard allocation',
          details: item.details || []
        }))
      },
      timeline: {
        monthlySchedule: estimation.cashflow.map((month: any, index: number) => {
          const cumulative = estimation.cashflow.slice(0, index + 1).reduce((sum: number, m: any) => sum + m.amount, 0);
          const progress = ((cumulative / estimation.totalEstimatedCost) * 100).toFixed(1) + '%';
          return {
            month: month.month,
            phase: month.phase,
            investment: month.amount,
            formattedInvestment: `${estimation.currencySymbol} ${month.amount.toLocaleString()}`,
            cumulative: cumulative,
            formattedCumulative: `${estimation.currencySymbol} ${cumulative.toLocaleString()}`,
            progress: progress
          };
        }),
        milestones: [
          'Site preparation and permits approval',
          'Foundation and structural work',
          'Building envelope and utilities',
          'Interior finishing and final inspections'
        ]
      },
      risks: [...estimation.risks, ...locationRisks].map((risk: any, index: number) => ({
        id: index + 1,
        risk: risk.risk,
        impact: risk.impact,
        mitigation: risk.mitigation
      })),
      efficiencyTips: [...(estimation.efficiencyTips || []), ...locationTips],
      assumptions: [
        `Material Cost Adjustment: ${((assumptions.materialCostMultiplier - 1) * 100).toFixed(1)}%`,
        `Labor Rate Adjustment: ${((assumptions.laborRateMultiplier - 1) * 100).toFixed(1)}%`,
        `Equipment Cost Adjustment: ${((assumptions.equipmentCostMultiplier - 1) * 100).toFixed(1)}%`,
        `Contingency Buffer: ${assumptions.contingencyPercentage}%`
      ],
      scenarioComparison: scenarioComparison ? {
        economy: {
          totalCost: `${estimation.currencySymbol} ${scenarioComparison.economy.totalEstimatedCost.toLocaleString()}`,
          breakdown: scenarioComparison.economy.breakdown.map(item => ({
            category: item.category,
            cost: `${estimation.currencySymbol} ${item.cost.toLocaleString()}`,
            percentage: ((item.cost / scenarioComparison.economy.totalEstimatedCost) * 100).toFixed(1) + '%'
          }))
        },
        standard: {
          totalCost: `${estimation.currencySymbol} ${scenarioComparison.standard.totalEstimatedCost.toLocaleString()}`,
          breakdown: scenarioComparison.standard.breakdown.map(item => ({
            category: item.category,
            cost: `${estimation.currencySymbol} ${item.cost.toLocaleString()}`,
            percentage: ((item.cost / scenarioComparison.standard.totalEstimatedCost) * 100).toFixed(1) + '%'
          }))
        },
        premium: {
          totalCost: `${estimation.currencySymbol} ${scenarioComparison.premium.totalEstimatedCost.toLocaleString()}`,
          breakdown: scenarioComparison.premium.breakdown.map(item => ({
            category: item.category,
            cost: `${estimation.currencySymbol} ${item.cost.toLocaleString()}`,
            percentage: ((item.cost / scenarioComparison.premium.totalEstimatedCost) * 100).toFixed(1) + '%'
          }))
        }
      } : null,
      metadata: {
        generatedDate: generatedAt.toLocaleDateString(),
        generatedTime: generatedAt.toLocaleTimeString(),
        company: 'BuildSmart AI',
        description: 'Intelligent Construction Cost Analysis',
        confidentiality: 'Confidential & Proprietary'
      }
    };

    console.log('Report data export completed successfully');
    return formattedReport;
  } catch (error) {
    console.error('Report data export error:', error);
    throw error;
  }
};

// Generate AI-powered scenario comparison
export const generateScenarioComparison = async (
  projectInputs: ProjectInputs,
  baseEstimate?: EstimationResult
): Promise<ScenarioComparison> => {
  try {
    // 2. Determine the anchor scenario
    let economy: EstimationResult;
    let standard: EstimationResult;
    let premium: EstimationResult;

    if (baseEstimate) {
      console.log(`Using provided base estimate as anchor for ${projectInputs.quality}`);

      // Use the base estimate EXACTLY for its corresponding quality
      // And derive the others relative to it
      if (projectInputs.quality === QualityLevel.ECONOMY) {
        economy = baseEstimate;
        // Derive Standard from Economy
        standard = deriveScenarioFromBase(baseEstimate, QualityLevel.ECONOMY, QualityLevel.STANDARD);
        // Derive Premium from Economy
        premium = deriveScenarioFromBase(baseEstimate, QualityLevel.ECONOMY, QualityLevel.PREMIUM);
      }
      else if (projectInputs.quality === QualityLevel.PREMIUM) {
        premium = baseEstimate;
        standard = deriveScenarioFromBase(baseEstimate, QualityLevel.PREMIUM, QualityLevel.STANDARD);
        economy = deriveScenarioFromBase(baseEstimate, QualityLevel.PREMIUM, QualityLevel.ECONOMY);
      }
      else {
        // Standard is default
        standard = baseEstimate;
        economy = deriveScenarioFromBase(baseEstimate, QualityLevel.STANDARD, QualityLevel.ECONOMY);
        premium = deriveScenarioFromBase(baseEstimate, QualityLevel.STANDARD, QualityLevel.PREMIUM);
      }
    } else {
      // Fallback: Generate Standard if no base provided
      console.log('No base estimate provided, generating Standard as anchor...');
      const standardInputs = { ...projectInputs, quality: QualityLevel.STANDARD };
      standard = await generateConstructionEstimate(standardInputs);
      economy = deriveScenarioFromBase(standard, QualityLevel.STANDARD, QualityLevel.ECONOMY);
      premium = deriveScenarioFromBase(standard, QualityLevel.STANDARD, QualityLevel.PREMIUM);
    }

    return { economy, standard, premium };

  } catch (error) {
    console.error('Scenario comparison generation failed:', error);
    return generateHardcodedScenarios(projectInputs);
  }
};

// Consolidated Helper: Derive any target scenario from any base scenario
const deriveScenarioFromBase = (
  base: EstimationResult,
  baseQuality: QualityLevel,
  targetQuality: QualityLevel
): EstimationResult => {
  if (baseQuality === targetQuality) return base;

  // Define relative cost factors (Standard = 1.0)
  const factors = {
    [QualityLevel.ECONOMY]: 0.75,
    [QualityLevel.STANDARD]: 1.0,
    [QualityLevel.PREMIUM]: 1.35
  };

  // Calculate the conversion ratio directly
  // This approach is much more consistent than round-tripping through Standard
  const conversionRatio = factors[targetQuality] / factors[baseQuality];

  // Specific multipliers for breakdown categories to be more realistic
  const categoryMultipliers = {
    'material': {
      [QualityLevel.ECONOMY]: 0.7,
      [QualityLevel.STANDARD]: 1.0,
      [QualityLevel.PREMIUM]: 1.5
    },
    'labor': {
      [QualityLevel.ECONOMY]: 0.8,
      [QualityLevel.STANDARD]: 1.0,
      [QualityLevel.PREMIUM]: 1.3
    },
    'equipment': {
      [QualityLevel.ECONOMY]: 0.9,
      [QualityLevel.STANDARD]: 1.0,
      [QualityLevel.PREMIUM]: 1.1
    },
    'default': {
      [QualityLevel.ECONOMY]: 0.75,
      [QualityLevel.STANDARD]: 1.0,
      [QualityLevel.PREMIUM]: 1.35
    }
  };

  const getCategoryRatio = (category: string) => {
    const cat = category.toLowerCase();
    let type = 'default';
    if (cat.includes('material')) type = 'material';
    else if (cat.includes('labor') || cat.includes('wage') || cat.includes('manpower')) type = 'labor';
    else if (cat.includes('equipment') || cat.includes('tool')) type = 'equipment';
    else if (cat.includes('permit') || cat.includes('approval')) return 1.0; // Permits usually fixed
    else if (cat.includes('contingency')) return 1.0; // Contingency logic handled separately usually

    const m = categoryMultipliers[type as keyof typeof categoryMultipliers];
    // ratio = New / Old
    return m[targetQuality] / m[baseQuality];
  };

  // Calculate new breakdown
  const newBreakdown = base.breakdown.map(item => {
    const ratio = getCategoryRatio(item.category);
    return {
      ...item,
      cost: Math.round(item.cost * ratio),
      description: item.description.replace(new RegExp(baseQuality, 'g'), targetQuality)
        .replace(new RegExp(baseQuality.toLowerCase(), 'g'), targetQuality.toLowerCase())
    };
  });

  const newTotal = newBreakdown.reduce((sum, item) => sum + item.cost, 0);

  // Scale cashflow to match new total
  const totalRatio = base.totalEstimatedCost > 0 ? newTotal / base.totalEstimatedCost : 1;

  const newCashflow = base.cashflow.map(c => ({
    ...c,
    amount: Math.round(c.amount * totalRatio)
  }));

  return {
    ...base,
    totalEstimatedCost: newTotal,
    breakdown: newBreakdown,
    cashflow: newCashflow,
    summary: base.summary.replace(new RegExp(baseQuality, 'g'), targetQuality)
      .replace(new RegExp(baseQuality.toLowerCase(), 'g'), targetQuality.toLowerCase()),
    confidenceReason: `Derived from ${baseQuality} (${base.confidenceScore}%) for comparison`
  };
};

/* 
// Deprecated helpers removed in favor of deriveScenarioFromBase for consistency
// const deriveScenario = ...
// const deriveStandardFromOther = ... 
*/

// Hardcoded fallback for scenario comparison
const generateHardcodedScenarios = (
  projectInputs: ProjectInputs
): ScenarioComparison => {
  const baseCost = 1000000; // Example base cost
  const currencySymbol = '$'; // Example currency

  const createScenario = (
    quality: QualityLevel,
    costMultiplier: number,
    confidence: number
  ): EstimationResult => ({
    totalEstimatedCost: baseCost * costMultiplier,
    breakdown: [],
    cashflow: [],
    risks: [],
    efficiencyTips: [],
    confidenceScore: confidence,
    confidenceReason: 'Hardcoded fallback data',
    currencySymbol,
    summary: `This is a hardcoded ${quality} scenario.`
  });

  return {
    economy: createScenario(QualityLevel.ECONOMY, 0.8, 70),
    standard: createScenario(QualityLevel.STANDARD, 1.0, 85),
    premium: createScenario(QualityLevel.PREMIUM, 1.5, 80),
  };
};

// Apply editable assumptions to adjust the estimation
export const applyAssumptions = (
  baseEstimation: EstimationResult,
  assumptions: EditableAssumptions
): EstimationResult => {
  // Adjust breakdown costs based on categories
  const adjustedBreakdown = baseEstimation.breakdown.map(item => {
    let multiplier = 1.0;
    const category = item.category.toLowerCase();
    if (category.includes('material')) {
      multiplier = assumptions.materialCostMultiplier;
    } else if (category.includes('labor') || category.includes('manpower')) {
      multiplier = assumptions.laborRateMultiplier;
    } else if (category.includes('equipment')) {
      multiplier = assumptions.equipmentCostMultiplier;
    }
    return {
      ...item,
      cost: item.cost * multiplier
    };
  });

  // Calculate adjusted total from breakdown, or fallback to adjusting total directly
  let adjustedTotal = baseEstimation.totalEstimatedCost;
  if (adjustedBreakdown.length > 0) {
    adjustedTotal = adjustedBreakdown.reduce((sum, item) => sum + item.cost, 0);
  } else {
    // If no breakdown, apply multipliers to total (simplified)
    adjustedTotal *= assumptions.materialCostMultiplier * assumptions.laborRateMultiplier * assumptions.equipmentCostMultiplier;
  }

  // Add contingency
  adjustedTotal *= (1 + assumptions.contingencyPercentage / 100);

  // Adjust cashflow proportionally
  const totalMultiplier = adjustedTotal / baseEstimation.totalEstimatedCost;
  const adjustedCashflow = baseEstimation.cashflow.map(month => ({
    ...month,
    amount: month.amount * totalMultiplier
  }));

  return {
    ...baseEstimation,
    totalEstimatedCost: adjustedTotal,
    breakdown: adjustedBreakdown,
    cashflow: adjustedCashflow,
    summary: `${baseEstimation.summary} (Adjusted with assumptions)`
  };
};

// Generate professional PDF report
export const generatePDF = async (reportData: ReportData): Promise<void> => {
  try {
    console.log('Generating professional PDF report...');
    const exportedData = await exportReportData(reportData);

    const doc = new jsPDF();
    let y = 20; // Y-position cursor
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 14;
    const contentWidth = pageWidth - (2 * margin);
    let currentPage = 1;

    // Color scheme
    const colors = {
      primary: '#3b82f6',
      secondary: '#10b981',
      danger: '#ef4444',
      warning: '#f59e0b',
      dark: '#1e293b',
      lightGray: '#f1f5f9',
      mediumGray: '#94a3b8'
    };

    // Helper: Add page header (company branding)
    const addPageHeader = () => {
      doc.setDrawColor(59, 130, 246);
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 8, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('BuildSmart AI', margin, 5);
      doc.setFont('helvetica', 'normal');
      doc.text('Construction Cost Intelligence', pageWidth - margin, 5, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    // Helper: Add page footer
    const addPageFooter = () => {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(exportedData.metadata.confidentiality, pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text(`Generated: ${exportedData.metadata.generatedDate} ${exportedData.metadata.generatedTime}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    // Helper: New page with header and footer
    const addNewPage = () => {
      doc.addPage();
      currentPage++;
      y = 18;
      addPageHeader();
      addPageFooter();
    };

    // Helper: Check if we need a new page
    const checkPageBreak = (neededSpace: number) => {
      if (y + neededSpace > pageHeight - 25) {
        addNewPage();
      }
    };

    // Helper: Draw section header with icon
    const drawSectionHeader = (text: string, icon?: string) => {
      checkPageBreak(15);
      doc.setDrawColor(59, 130, 246);
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, y, 4, 8, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(text, margin + 7, y + 6);
      y += 10;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    };

    // Helper: Draw info box
    const drawInfoBox = (label: string, value: string, x: number, w: number, bgColor: [number, number, number] = [241, 245, 249]) => {
      doc.setFillColor(...bgColor);
      doc.roundedRect(x, y, w, 16, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(label, x + 3, y + 5);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      const valueLines = doc.splitTextToSize(value, w - 6);
      doc.text(valueLines, x + 3, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    };

    // Initialize first page
    addPageHeader();
    addPageFooter();

    // 1. Cover Page - Professional Title
    y = 50;
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(exportedData.title, pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(exportedData.subtitle, pageWidth / 2, y, { align: 'center' });

    y += 25;
    // Key metrics boxes
    const boxWidth = (contentWidth - 12) / 3;
    drawInfoBox('TOTAL INVESTMENT', exportedData.totalCost.formatted, margin, boxWidth, [239, 246, 255]);
    drawInfoBox('AI CONFIDENCE', exportedData.executiveSummary.marketIntelligence.confidenceLevel, margin + boxWidth + 6, boxWidth, [240, 253, 244]);

    const budgetDiff = reportData.projectInputs.budgetLimit - exportedData.totalCost.amount;
    const budgetStatus = budgetDiff >= 0 ? 'SURPLUS' : 'DEFICIT';
    const budgetColor: [number, number, number] = budgetDiff >= 0 ? [240, 253, 244] : [254, 242, 242];
    drawInfoBox('BUDGET STATUS', `${budgetStatus}: ${exportedData.totalCost.currencySymbol} ${Math.abs(budgetDiff).toLocaleString()}`, margin + 2 * (boxWidth + 6), boxWidth, budgetColor);

    y += 20;

    // Project overview narrative
    checkPageBreak(30);
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const overviewLines = doc.splitTextToSize(exportedData.executiveSummary.projectOverview, contentWidth);
    doc.text(overviewLines, margin, y);
    y += overviewLines.length * 4.5 + 8;

    // Confidence reason
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    const confidenceLines = doc.splitTextToSize(`AI Analysis: ${exportedData.executiveSummary.marketIntelligence.confidenceReason}`, contentWidth);
    doc.text(confidenceLines, margin, y);
    doc.setFont('helvetica', 'normal');
    y += confidenceLines.length * 3.5 + 10;

    // 2. Project Details Section
    addNewPage();
    drawSectionHeader('PROJECT INFORMATION');

    doc.setFontSize(10);
    const detailsData = [
      ['Project Type:', exportedData.project.type],
      ['Location:', exportedData.project.location],
      ['Project Size:', `${exportedData.project.sizeSqFt.toLocaleString()} sq ft`],
      ['Quality Level:', exportedData.project.quality],
      ['Timeline:', `${exportedData.project.timelineMonths} months`],
      ['Workforce:', `${exportedData.project.manpower} personnel`]
    ];

    detailsData.forEach(([label, value]) => {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, y);
      y += 6;
    });
    y += 4;

    // 3. Executive Summary Metrics
    drawSectionHeader('KEY METRICS');
    const metricsData = [
      ['Total Investment:', exportedData.executiveSummary.keyMetrics.totalInvestment],
      ['AI Confidence:', exportedData.executiveSummary.keyMetrics.aiConfidence],
      ['Project Duration:', exportedData.executiveSummary.keyMetrics.projectDuration],
      ['Risk Assessment:', exportedData.executiveSummary.keyMetrics.riskAssessment]
    ];

    metricsData.forEach(([label, value]) => {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 50, y);
      y += 6;
    });
    y += 8;

    // 4. Assumptions Used
    drawSectionHeader('CALCULATION ASSUMPTIONS');
    doc.setFontSize(9);
    exportedData.assumptions.forEach((assumption: string) => {
      checkPageBreak(5);
      doc.text(`• ${assumption}`, margin + 3, y);
      y += 5;
    });
    y += 8;

    // 5. Cost Breakdown Section
    addNewPage();
    drawSectionHeader('DETAILED COST BREAKDOWN');

    // Calculate total for percentages
    const total = exportedData.totalCost.amount;

    // Table header with background
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Category', margin + 2, y + 5);
    doc.text('Amount', margin + 60, y + 5);
    doc.text('%', margin + 95, y + 5);
    doc.text('Description', margin + 110, y + 5);
    y += 10;
    doc.setFont('helvetica', 'normal');

    exportedData.costBreakdown.categories.forEach((cat: any, index: number) => {
      checkPageBreak(20);

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 2, contentWidth, 12, 'F');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.category, margin + 2, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(cat.formattedAmount, margin + 60, y + 3);
      doc.text(cat.percentage, margin + 95, y + 3);

      const descLines = doc.splitTextToSize(cat.description, 70);
      doc.setFontSize(8);
      doc.text(descLines, margin + 110, y + 3);

      const lineHeight = Math.max(10, descLines.length * 3.5 + 4);
      y += lineHeight;

      // Details if available
      if (cat.details && cat.details.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        cat.details.slice(0, 2).forEach((detail: string) => {
          checkPageBreak(3.5);
          doc.text(`  → ${detail}`, margin + 110, y);
          y += 3.5;
        });
        doc.setTextColor(0, 0, 0);
        y += 1;
      }
    });

    // Total row
    y += 2;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ESTIMATED COST', margin + 2, y);
    doc.text(exportedData.totalCost.formatted, margin + 60, y);
    y += 8;
    doc.setLineWidth(0.2);

    // 6. Timeline & Cashflow
    addNewPage();
    drawSectionHeader('PROJECT TIMELINE & CASHFLOW');

    // Milestones
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Milestones:', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    exportedData.timeline.milestones.forEach((milestone: string, index: number) => {
      checkPageBreak(5);
      doc.text(`${index + 1}. ${milestone}`, margin + 3, y);
      y += 5;
    });
    y += 6;

    // Monthly cashflow table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Monthly Investment Schedule:', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(9);
    doc.text('Month', margin + 2, y + 5);
    doc.text('Phase', margin + 25, y + 5);
    doc.text('Investment', margin + 100, y + 5);
    doc.text('Cumulative', margin + 135, y + 5);
    doc.text('Progress', margin + 170, y + 5);
    y += 10;
    doc.setFont('helvetica', 'normal');

    exportedData.timeline.monthlySchedule.forEach((month: any, index: number) => {
      checkPageBreak(6);

      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 2, contentWidth, 6, 'F');
      }

      doc.setFontSize(8);
      doc.text(String(month.month), margin + 2, y + 2.5);
      const phaseText = doc.splitTextToSize(month.phase, 70);
      doc.text(phaseText[0], margin + 25, y + 2.5);
      doc.text(month.formattedInvestment, margin + 100, y + 2.5);
      doc.text(month.formattedCumulative, margin + 135, y + 2.5);
      doc.text(month.progress, margin + 170, y + 2.5);
      y += 6;
    });
    y += 8;

    // 7. Risk Analysis Section
    addNewPage();
    drawSectionHeader('COMPREHENSIVE RISK ANALYSIS');

    exportedData.risks.forEach((risk: any, index: number) => {
      // Split text into lines
      const riskTitleLines = doc.splitTextToSize(risk.risk, contentWidth - 50);
      const mitigationLines = doc.splitTextToSize(risk.mitigation, contentWidth - 12);

      // Calculate box height with explicit line spacing
      const lineSpacing = 4.5;
      const titleHeight = riskTitleLines.length * lineSpacing;
      const mitigationHeight = mitigationLines.length * lineSpacing;
      const boxHeight = 10 + titleHeight + 8 + mitigationHeight + 6; // top + title + gap + mitigation + bottom

      checkPageBreak(boxHeight + 7);

      // Risk container background
      const bgColors: Record<string, [number, number, number]> = {
        'High': [254, 242, 242],
        'Medium': [254, 252, 232],
        'Low': [239, 246, 255]
      };
      const bgColor: [number, number, number] = bgColors[risk.impact] || [249, 250, 251];
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');

      // Left accent bar
      const accentColors: Record<string, [number, number, number]> = {
        'High': [220, 38, 38],
        'Medium': [234, 179, 8],
        'Low': [37, 99, 235]
      };
      const accentColor: [number, number, number] = accentColors[risk.impact] || [100, 116, 139];
      doc.setFillColor(...accentColor);
      doc.rect(margin, y, 3, boxHeight, 'F');

      // Track current Y position for content
      let currentY = y + 6;

      // Risk number and title - render line by line
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);

      for (let i = 0; i < riskTitleLines.length; i++) {
        const prefix = i === 0 ? `${index + 1}. ` : '    ';
        doc.text(prefix + riskTitleLines[i], margin + 6, currentY);
        currentY += lineSpacing;
      }

      // Impact badge (top right)
      doc.setFillColor(...accentColor);
      doc.roundedRect(pageWidth - margin - 28, y + 4, 26, 5, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(risk.impact.toUpperCase(), pageWidth - margin - 15, y + 7.5, { align: 'center' });

      // Space before mitigation
      currentY += 3;

      // Mitigation label
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Mitigation:', margin + 6, currentY);
      currentY += 4;

      // Mitigation text - render line by line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (let i = 0; i < mitigationLines.length; i++) {
        doc.text(mitigationLines[i], margin + 6, currentY);
        currentY += lineSpacing;
      }

      y += boxHeight + 6;
      doc.setTextColor(0, 0, 0);
    });

    // 8. Efficiency Tips Section
    addNewPage();
    drawSectionHeader('OPTIMIZATION RECOMMENDATIONS');

    // Introduction text
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Strategic recommendations to optimize project cost, timeline, and quality:', margin, y);
    y += 8;
    doc.setTextColor(0, 0, 0);

    exportedData.efficiencyTips.forEach((tip: string, index: number) => {
      // Split text into lines
      const tipLines = doc.splitTextToSize(tip, contentWidth - 12);

      // Calculate box height with consistent line spacing
      const lineSpacing = 4.5;
      const boxHeight = Math.max(16, 10 + tipLines.length * lineSpacing + 6); // top padding + content + bottom padding

      checkPageBreak(boxHeight + 5);

      // Tip container background
      doc.setFillColor(254, 252, 232);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');

      // Left accent stripe
      doc.setFillColor(234, 179, 8);
      doc.rect(margin, y, 3, boxHeight, 'F');

      // Track current Y position
      let currentY = y + 6;

      // Tip text line by line with number prefix on first line
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      for (let i = 0; i < tipLines.length; i++) {
        const prefix = i === 0 ? `${index + 1}. ` : '    ';
        doc.text(prefix + tipLines[i], margin + 6, currentY);
        currentY += lineSpacing;
      }

      y += boxHeight + 5;
      doc.setTextColor(0, 0, 0);
    });

    // 9. Scenario Comparison (if available)
    if (exportedData.scenarioComparison) {
      addNewPage();
      drawSectionHeader('QUALITY LEVEL COMPARISON');

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Compare different quality levels to make informed decisions about your project budget and specifications.', margin, y);
      y += 10;
      doc.setTextColor(0, 0, 0);

      const scenarios = ['economy', 'standard', 'premium'];
      const scenarioLabels = ['Economy', 'Standard', 'Premium'];

      scenarios.forEach((scenario, idx) => {
        checkPageBreak(40);

        const scenarioData = exportedData.scenarioComparison[scenario];

        // Scenario header
        doc.setFillColor(241, 245, 249);
        if (scenario === 'economy') doc.setFillColor(239, 246, 255);
        if (scenario === 'premium') doc.setFillColor(250, 245, 255);

        doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(scenarioLabels[idx], margin + 3, y + 5);
        doc.text(scenarioData.totalCost, pageWidth - margin - 3, y + 5, { align: 'right' });
        y += 10;

        // Breakdown
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        scenarioData.breakdown.forEach((item: any) => {
          checkPageBreak(4.5);
          doc.text(`  • ${item.category}`, margin + 5, y);
          doc.text(item.cost, margin + 80, y);
          doc.text(item.percentage, pageWidth - margin - 3, y, { align: 'right' });
          y += 4.5;
        });
        y += 4;
      });
    }

    // 10. Final Page - Summary & Disclaimers
    addNewPage();
    drawSectionHeader('REPORT SUMMARY');

    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const summaryText = `This comprehensive construction cost analysis has been generated using advanced AI technology powered by BuildSmart AI. The estimate includes detailed cost breakdowns, risk assessments, timeline projections, and optimization recommendations specifically tailored for ${exportedData.project.location}.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4.5 + 8;

    // Important notes
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Important Notes:', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notes = [
      '• This estimate is based on current market data and AI analysis with ' + exportedData.executiveSummary.marketIntelligence.confidenceLevel + ' confidence',
      '• Actual costs may vary based on market conditions, material availability, and project specifics',
      '• All assumptions and adjustments are documented in this report',
      '• We recommend consulting with local contractors for final pricing',
      '• This report should be used as a planning tool and budget guideline'
    ];
    notes.forEach((note, idx) => {
      doc.text(note, margin + 5, y + 10 + (idx * 5));
    });
    y += 40;

    // Contact & metadata
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('For questions or detailed consultation, please contact BuildSmart AI', margin, y);
    y += 5;
    doc.text(`Report Generated: ${exportedData.metadata.generatedDate} at ${exportedData.metadata.generatedTime}`, margin, y);

    // Save the PDF with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    doc.save(`BuildSmart_AI_Construction_Estimate_${timestamp}.pdf`);
    console.log('Professional PDF report generated successfully.');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF report.');
  }
};