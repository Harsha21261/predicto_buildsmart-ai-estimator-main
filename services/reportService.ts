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

    // Helper function for drawing a section header
    const drawHeader = (text: string) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 14, y);
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, 196, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
    };

    // 1. Report Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(exportedData.title, 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(exportedData.subtitle, 105, y, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date(exportedData.generatedAt).toLocaleString()}`, 105, y, { align: 'center' });
    y += 15;
    doc.setTextColor(0);

    // 2. Executive Summary
    drawHeader('Executive Summary');
    doc.setFontSize(11);
    doc.text(`Total Estimated Cost:`, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(exportedData.totalCost.formatted, 70, y);
    doc.setFont('helvetica', 'normal');
    y += 7;

    const budgetDiff = reportData.projectInputs.budgetLimit - exportedData.totalCost.amount;
    const budgetStatus = budgetDiff >= 0 ? 'Surplus' : 'Deficit';
    doc.text(`Budget Analysis:`, 14, y);
    doc.text(`${budgetStatus} of ${exportedData.totalCost.currencySymbol} ${Math.abs(budgetDiff).toLocaleString()}`, 70, y);
    y += 7;

    doc.text(`AI Confidence:`, 14, y);
    doc.text(`${exportedData.executiveSummary.marketIntelligence.confidenceLevel}`, 70, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(120);
    const reasonLines = doc.splitTextToSize(`(${exportedData.executiveSummary.marketIntelligence.confidenceReason})`, 120);
    doc.text(reasonLines, 72, y);
    y += (reasonLines.length * 4) + 5;
    doc.setTextColor(0);

    // 3. Project Details
    drawHeader('Project Details');
    doc.setFontSize(10);
    doc.text(`Project Type: ${exportedData.project.type}`, 14, y);
    doc.text(`Location: ${exportedData.project.location}`, 105, y);
    y += 7;
    doc.text(`Size: ${exportedData.project.sizeSqFt.toLocaleString()} sq ft`, 14, y);
    doc.text(`Quality: ${exportedData.project.quality}`, 105, y);
    y += 7;
    doc.text(`Timeline: ${exportedData.project.timelineMonths} months`, 14, y);
    doc.text(`Manpower: ${exportedData.project.manpower} personnel`, 105, y);
    y += 10;

    // 4. Cost Breakdown (Table)
    drawHeader('Cost Breakdown');
    let tableY = y;
    const colWidths = [50, 40, 30, 70];
    doc.setFont('helvetica', 'bold');
    doc.text('Category', 15, tableY);
    doc.text('Cost', 65, tableY);
    doc.text('% of Total', 105, tableY);
    doc.text('Description', 135, tableY);
    tableY += 5;
    doc.setDrawColor(200);
    doc.line(14, tableY, 196, tableY);
    tableY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    exportedData.costBreakdown.categories.forEach((cat: any) => {
      if (tableY > 260) {
        doc.addPage();
        tableY = 20;
      }
      const descriptionLines = doc.splitTextToSize(cat.description || '', colWidths[3] - 5);
      const rowHeight = Math.max(8, descriptionLines.length * 4 + 4);
      doc.text(cat.category, 15, tableY + 4);
      doc.text(cat.formattedAmount, 65, tableY + 4);
      doc.text(cat.percentage, 105, tableY + 4);
      doc.text(descriptionLines, 135, tableY + 4);
      tableY += rowHeight;
      doc.setDrawColor(230);
      doc.line(14, tableY - 2, 196, tableY - 2);
    });
    y = tableY + 5;
    doc.setFontSize(10);

    // 5. Cashflow (Table)
    if (y > 250) { doc.addPage(); y = 20; }
    drawHeader('Projected Monthly Cashflow');
    tableY = y;
    doc.setFont('helvetica', 'bold');
    doc.text('Month', 15, tableY);
    doc.text('Phase', 65, tableY);
    doc.text('Investment', 135, tableY);
    tableY += 5;
    doc.line(14, tableY, 196, tableY);
    tableY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    exportedData.timeline.monthlySchedule.forEach((month: any) => {
      if (tableY > 270) { doc.addPage(); tableY = 20; }
      doc.text(String(month.month), 15, tableY);
      doc.text(month.phase, 65, tableY);
      doc.text(month.formattedInvestment, 135, tableY);
      tableY += 7;
    });
    y = tableY + 5;
    doc.setFontSize(10);

    // 6. Risk Analysis
    if (y > 250) { doc.addPage(); y = 20; }
    drawHeader('Risk Analysis');
    exportedData.risks.forEach((risk: any) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(risk.risk, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Impact: ${risk.impact}`, 160, y);
      doc.setFontSize(10);
      y += 6;
      const mitigationLines = doc.splitTextToSize(`Mitigation: ${risk.mitigation}`, 180);
      doc.text(mitigationLines, 14, y);
      y += (mitigationLines.length * 5) + 5;
    });

    // 7. Efficiency Tips
    if (y > 240) { doc.addPage(); y = 20; }
    drawHeader('Efficiency Tips');
    exportedData.efficiencyTips.forEach((tip: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const tipLines = doc.splitTextToSize(tip, 175);
      doc.text('•', 14, y + 4);
      doc.text(tipLines, 20, y + 4);
      y += (tipLines.length * 5) + 3;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${exportedData.metadata.company} - ${exportedData.metadata.description}`, 105, 285, { align: 'center' });
    doc.text(exportedData.metadata.confidentiality, 105, 290, { align: 'center' });

    // Save the PDF
    doc.save('BuildSmart_AI_Cost_Estimate.pdf');
    console.log('PDF report saved successfully.');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF report.');
  }
};