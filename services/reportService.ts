import { ProjectInputs, EstimationResult, ReportData, EditableAssumptions, ScenarioComparison, QualityLevel } from '../types';
import { generateConstructionEstimate, generateLocationInsights } from './geminiService';

// AI-powered location-specific market data using NVIDIA Nemotron
const getLocationSpecificTips = async (location: string, projectType: string): Promise<string[]> => {
  const aiTips = await generateLocationInsights(location, projectType, 'tips');
  
  const fallbackTips = [
    'Consider bulk purchasing materials to reduce costs by 8-12%',
    'Schedule concrete pours during off-peak hours for better rates',
    'Use local suppliers to minimize transportation costs',
    'Research local building codes and permit requirements early',
    'Consider seasonal weather patterns for optimal construction timing',
    'Implement digital project management tools for better coordination',
    'Source skilled labor from established local networks',
    'Plan material storage to minimize waste and theft',
    'Negotiate long-term contracts with reliable suppliers',
    'Use energy-efficient equipment to reduce operational costs'
  ];
  
  return Array.isArray(aiTips) && aiTips.length > 0 ? aiTips : fallbackTips;
};

const getLocationSpecificRisks = async (location: string, projectType: string): Promise<Array<{risk: string, impact: string, mitigation: string}>> => {
  const aiRisks = await generateLocationInsights(location, projectType, 'risks');
  
  const fallbackRisks = [
    {
      risk: 'Material price volatility',
      impact: 'Medium',
      mitigation: 'Lock in material prices early and maintain 5-8% contingency for price fluctuations'
    },
    {
      risk: 'Weather-related delays',
      impact: 'Medium', 
      mitigation: 'Plan construction schedule around seasonal weather patterns and maintain flexible timelines'
    },
    {
      risk: 'Local regulatory compliance',
      impact: 'Medium',
      mitigation: 'Engage local regulatory experts early and budget for potential approval delays'
    },
    {
      risk: 'Skilled labor shortage',
      impact: 'Medium',
      mitigation: 'Secure skilled workers early with competitive packages and consider training programs'
    },
    {
      risk: 'Supply chain disruptions',
      impact: 'Medium',
      mitigation: 'Diversify supplier base and maintain strategic inventory buffers'
    },
    {
      risk: 'Equipment availability issues',
      impact: 'Low',
      mitigation: 'Reserve equipment well in advance and have backup rental options'
    }
  ];
  
  return Array.isArray(aiRisks) && aiRisks.length > 0 ? aiRisks : fallbackRisks;
};

// PDF generation using jsPDF
export const generatePDFReport = async (reportData: ReportData): Promise<void> => {
  // Dynamic import to reduce bundle size
  const jsPDF = (await import('jspdf')).default;
  
  const doc = new jsPDF();
  const { projectInputs, estimation, assumptions, generatedAt } = reportData;
  
  // Colors
  const colors = {
    primary: [41, 98, 255] as const,
    secondary: [99, 102, 241] as const,
    success: [34, 197, 94] as const,
    warning: [251, 191, 36] as const,
    danger: [239, 68, 68] as const,
    gray: [107, 114, 128] as const,
    lightGray: [229, 231, 235] as const
  };
  
  // Helper functions
  const addHeader = (title: string, subtitle?: string) => {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 20, 25);
    
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 20, 35);
    }
  };
  
  const addSection = (title: string, y: number) => {
    doc.setFillColor(...colors.lightGray);
    doc.rect(15, y - 5, 180, 12, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(title, 20, y + 2);
    
    return y + 15;
  };
  
  const addMetricBox = (label: string, value: string, x: number, y: number, color: readonly [number, number, number] = colors.primary) => {
    doc.setFillColor(...color);
    doc.rect(x, y, 80, 25, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 1, y + 1, 78, 23, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    doc.text(label, x + 5, y + 10);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, x + 5, y + 20);
  };
  
  // PAGE 1: Cover Page
  addHeader('BuildSmart AI Construction Report', `Professional Estimate & Analysis`);
  
  // Company/Project Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(20, 60, 170, 80, 'F');
  doc.setDrawColor(...colors.lightGray);
  doc.rect(20, 60, 170, 80, 'S');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Project Overview', 30, 75);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  let yPos = 90;
  const projectDetails = [
    `Project Type: ${projectInputs.type}`,
    `Location: ${projectInputs.location}`,
    `Size: ${projectInputs.sizeSqFt.toLocaleString()} sq ft`,
    `Quality Level: ${projectInputs.quality}`,
    `Timeline: ${projectInputs.timelineMonths} months`,
    `Workforce: ${projectInputs.manpower} workers`
  ];
  
  projectDetails.forEach(detail => {
    doc.text(`• ${detail}`, 30, yPos);
    yPos += 8;
  });
  
  // Total Cost Highlight
  doc.setFillColor(...colors.success);
  doc.rect(20, 160, 170, 35, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Total Estimated Cost', 30, 175);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${estimation.currencySymbol} ${estimation.totalEstimatedCost.toLocaleString()}`, 30, 188);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.text(`Generated on: ${generatedAt.toLocaleDateString()}`, 20, 270);
  doc.text('BuildSmart AI - Intelligent Construction Estimation', 20, 280);
  
  // PAGE 2: Executive Summary
  doc.addPage();
  addHeader('Executive Summary');
  
  let currentY = 55;
  
  // Key Metrics
  currentY = addSection('Key Metrics', currentY);
  addMetricBox('Total Cost', `${estimation.currencySymbol} ${estimation.totalEstimatedCost.toLocaleString()}`, 20, currentY, colors.primary);
  addMetricBox('Confidence', `${estimation.confidenceScore}%`, 110, currentY, colors.success);
  addMetricBox('Timeline', `${projectInputs.timelineMonths} months`, 20, currentY + 35, colors.secondary);
  addMetricBox('Risk Level', estimation.risks.length > 0 ? 'Medium' : 'Low', 110, currentY + 35, colors.warning);
  
  currentY += 85;
  
  // Project Summary
  currentY = addSection('Project Summary', currentY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const summaryText = `This ${projectInputs.type.toLowerCase()} project in ${projectInputs.location} spans ${projectInputs.sizeSqFt.toLocaleString()} square feet with ${projectInputs.quality.toLowerCase()} quality specifications. The estimated completion timeline is ${projectInputs.timelineMonths} months with a workforce of ${projectInputs.manpower} personnel.`;
  
  const wrappedSummary = doc.splitTextToSize(summaryText, 170);
  doc.text(wrappedSummary, 20, currentY);
  
  currentY += wrappedSummary.length * 6 + 15;
  
  // Confidence Analysis
  currentY = addSection('AI Confidence Analysis', currentY);
  doc.setFontSize(11);
  doc.text(`Confidence Score: ${estimation.confidenceScore}%`, 20, currentY);
  currentY += 10;
  
  if (estimation.confidenceReason) {
    const wrappedReason = doc.splitTextToSize(estimation.confidenceReason, 170);
    doc.text(wrappedReason, 20, currentY);
  }
  
  // PAGE 3: Detailed Cost Breakdown
  doc.addPage();
  addHeader('Detailed Cost Breakdown');
  
  currentY = 55;
  currentY = addSection('Cost Categories', currentY);
  
  // Create table for cost breakdown
  doc.setFillColor(...colors.lightGray);
  doc.rect(20, currentY, 170, 12, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Category', 25, currentY + 8);
  doc.text('Cost', 120, currentY + 8);
  doc.text('Percentage', 155, currentY + 8);
  
  currentY += 15;
  
  estimation.breakdown.forEach((item, index) => {
    const percentage = ((item.cost / estimation.totalEstimatedCost) * 100).toFixed(1);
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, currentY - 3, 170, 10, 'F');
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const categoryText = doc.splitTextToSize(item.category, 90);
    doc.text(categoryText, 25, currentY + 3);
    doc.text(`${estimation.currencySymbol} ${item.cost.toLocaleString()}`, 120, currentY + 3);
    doc.text(`${percentage}%`, 155, currentY + 3);
    
    currentY += Math.max(10, categoryText.length * 5);
    
    // Add description if space allows
    if (currentY < 240 && item.description) {
      doc.setFontSize(8);
      doc.setTextColor(...colors.gray);
      const descText = doc.splitTextToSize(item.description, 165);
      doc.text(descText, 25, currentY);
      currentY += descText.length * 4 + 5;
    }
  });
  
  // PAGE 4: Timeline & Cashflow
  doc.addPage();
  addHeader('Project Timeline & Cashflow');
  
  currentY = 55;
  currentY = addSection('Monthly Cashflow Projection', currentY);
  
  // Cashflow table
  doc.setFillColor(...colors.lightGray);
  doc.rect(20, currentY, 170, 12, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Month', 25, currentY + 8);
  doc.text('Phase', 60, currentY + 8);
  doc.text('Amount', 120, currentY + 8);
  doc.text('Cumulative', 155, currentY + 8);
  
  currentY += 15;
  let cumulative = 0;
  
  for (let index = 0; index < estimation.cashflow.length; index++) {
    const month = estimation.cashflow[index];
    cumulative += month.amount;
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, currentY - 3, 170, 10, 'F');
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    doc.text(`${month.month}`, 25, currentY + 3);
    doc.text(month.phase, 60, currentY + 3);
    doc.text(`${estimation.currencySymbol} ${month.amount.toLocaleString()}`, 120, currentY + 3);
    doc.text(`${estimation.currencySymbol} ${cumulative.toLocaleString()}`, 155, currentY + 3);
    
    currentY += 10;
    
    if (currentY > 250) return; // Prevent overflow
  }
  
  // PAGE 5: Risk Analysis & Mitigation
  doc.addPage();
  addHeader('Risk Analysis & Mitigation Strategies');
  
  currentY = 55;
  currentY = addSection('Identified Risks', currentY);
  
  // Combine existing risks with location-specific risks
  const locationRisks = await getLocationSpecificRisks(projectInputs.location, projectInputs.type);
  const allRisks = [...estimation.risks, ...locationRisks];
  
  if (allRisks.length > 0) {
    for (let index = 0; index < allRisks.length; index++) {
      const risk = allRisks[index];
      // Risk box
      const riskColor = risk.impact === 'High' ? colors.danger : 
                       risk.impact === 'Medium' ? colors.warning : colors.success;
      
      doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
      doc.rect(20, currentY, 170, 8, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${index + 1}. ${risk.risk} (${risk.impact} Impact)`, 25, currentY + 5);
      
      currentY += 12;
      
      // Mitigation
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('Mitigation Strategy:', 25, currentY);
      currentY += 6;
      
      const mitigationText = doc.splitTextToSize(risk.mitigation, 165);
      doc.text(mitigationText, 25, currentY);
      currentY += mitigationText.length * 5 + 10;
      
      if (currentY > 250) {
        doc.addPage();
        addHeader('Risk Analysis & Mitigation Strategies (Continued)');
        currentY = 55;
      }
    }
  } else {
    doc.setFontSize(11);
    doc.setTextColor(...colors.success);
    doc.text('✓ No significant risks identified for this project.', 25, currentY);
  }
  
  // PAGE 6: Efficiency Tips & Recommendations
  doc.addPage();
  addHeader('Optimization Recommendations');
  
  currentY = 55;
  currentY = addSection('Smart Efficiency Tips', currentY);
  
  // Combine existing tips with location-specific tips
  const locationTips = await getLocationSpecificTips(projectInputs.location, projectInputs.type);
  const existingTips = estimation.efficiencyTips || [];
  const allTips = [...existingTips, ...locationTips];
  
  if (allTips.length > 0) {
    for (let index = 0; index < allTips.length; index++) {
      const tip = allTips[index];
      doc.setFillColor(...colors.success);
      doc.circle(25, currentY + 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const tipText = doc.splitTextToSize(tip, 160);
      doc.text(tipText, 32, currentY + 3);
      currentY += tipText.length * 5 + 8;
      
      if (currentY > 250) {
        doc.addPage();
        addHeader('Optimization Recommendations (Continued)');
        currentY = 55;
      }
    }
  }
  
  // Assumptions section
  currentY += 15;
  if (currentY > 220) {
    doc.addPage();
    addHeader('Assumptions & Methodology');
    currentY = 55;
  }
  
  currentY = addSection('Applied Assumptions', currentY);
  
  const assumptionsList = [
    `Material Cost Adjustment: ${((assumptions.materialCostMultiplier - 1) * 100).toFixed(1)}%`,
    `Labor Rate Adjustment: ${((assumptions.laborRateMultiplier - 1) * 100).toFixed(1)}%`,
    `Equipment Cost Adjustment: ${((assumptions.equipmentCostMultiplier - 1) * 100).toFixed(1)}%`,
    `Contingency Buffer: ${assumptions.contingencyPercentage}%`
  ];
  
  assumptionsList.forEach(assumption => {
    doc.setFontSize(10);
    doc.text(`• ${assumption}`, 25, currentY);
    currentY += 8;
  });
  
  // Footer on last page
  doc.setFillColor(...colors.primary);
  doc.rect(0, 270, 210, 27, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BuildSmart AI - Intelligent Construction Estimation', 105, 282, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Generated: ${generatedAt.toLocaleDateString()} | Confidential`, 105, 290, { align: 'center' });
  
  // Save the PDF
  doc.save(`BuildSmart_Professional_Estimate_${projectInputs.type}_${Date.now()}.pdf`);
};

// Generate scenario comparison
export const generateScenarioComparison = async (inputs: ProjectInputs, baseEstimate: EstimationResult): Promise<ScenarioComparison> => {
  // Create scenarios based on the main estimate (not inputs)
  const createScenarioFromBase = (qualityLevel: QualityLevel, multiplier: number) => {
    const adjustedCost = Math.round(baseEstimate.totalEstimatedCost * multiplier);
    
    return {
      ...baseEstimate,
      totalEstimatedCost: adjustedCost,
      breakdown: baseEstimate.breakdown.map(item => ({
        ...item,
        cost: Math.round(item.cost * multiplier)
      })),
      cashflow: baseEstimate.cashflow.map(month => ({
        ...month,
        amount: Math.round(month.amount * multiplier)
      })),
      summary: `${qualityLevel} quality ${inputs.type} in ${inputs.location}`,
      confidenceScore: baseEstimate.confidenceScore,
      confidenceReason: `Based on main estimate adjusted for ${qualityLevel} quality`
    };
  };
  
  // Always create scenarios relative to the main estimate
  // Economy = 70% of main estimate
  // Standard = main estimate (100%)
  // Premium = 150% of main estimate
  const economy = createScenarioFromBase(QualityLevel.ECONOMY, 0.7);
  const standard = createScenarioFromBase(QualityLevel.STANDARD, 1.0);
  const premium = createScenarioFromBase(QualityLevel.PREMIUM, 1.5);
  
  return { economy, standard, premium };
};

// Apply assumptions to estimation result
export const applyAssumptions = (baseEstimation: EstimationResult, assumptions: EditableAssumptions): EstimationResult => {
  const adjustedBreakdown = baseEstimation.breakdown.map(item => {
    let multiplier = 1;
    
    if (item.category.toLowerCase().includes('material')) {
      multiplier = assumptions.materialCostMultiplier;
    } else if (item.category.toLowerCase().includes('labor') || item.category.toLowerCase().includes('wage')) {
      multiplier = assumptions.laborRateMultiplier;
    } else if (item.category.toLowerCase().includes('equipment')) {
      multiplier = assumptions.equipmentCostMultiplier;
    } else if (item.category.toLowerCase().includes('contingency')) {
      // Recalculate contingency based on new percentage
      const baseTotal = baseEstimation.breakdown
        .filter(b => !b.category.toLowerCase().includes('contingency'))
        .reduce((sum, b) => sum + b.cost, 0);
      return {
        ...item,
        cost: baseTotal * (assumptions.contingencyPercentage / 100)
      };
    }
    
    return {
      ...item,
      cost: item.cost * multiplier
    };
  });
  
  const newTotal = adjustedBreakdown.reduce((sum, item) => sum + item.cost, 0);
  
  // Adjust cashflow proportionally
  const costRatio = newTotal / baseEstimation.totalEstimatedCost;
  const adjustedCashflow = baseEstimation.cashflow.map(month => ({
    ...month,
    amount: Math.round(month.amount * costRatio)
  }));
  
  return {
    ...baseEstimation,
    totalEstimatedCost: Math.round(newTotal),
    breakdown: adjustedBreakdown,
    cashflow: adjustedCashflow
  };
};