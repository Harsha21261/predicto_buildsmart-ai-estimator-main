export enum ProjectType {
  RESIDENTIAL = 'Residential',
  COMMERCIAL = 'Commercial',
  INDUSTRIAL = 'Industrial',
  RENOVATION = 'Renovation'
}

export enum QualityLevel {
  ECONOMY = 'Economy',
  STANDARD = 'Standard',
  PREMIUM = 'Premium'
}

export enum BudgetVerdict {
  REALISTIC = 'Realistic',
  INSUFFICIENT = 'Insufficient',
  EXCESSIVE = 'Excessive'
}

export enum ImpactLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ProjectInputs {
  type: ProjectType;
  quality: QualityLevel;
  location: string; // "City, State"
  sizeSqFt: number;
  budgetLimit: number;
  timelineMonths: number;
  manpower: number;
}

export interface CostItem {
  category: string;
  cost: number;
  description: string;
  details?: string[];
}

export interface CashFlowMonth {
  month: number;
  amount: number;
  phase: string;
}

export interface RiskItem {
  risk: string;
  impact: ImpactLevel;
  mitigation: string;
}

export interface EstimationResult {
  currencySymbol: string;
  totalEstimatedCost: number;
  breakdown: CostItem[];
  cashflow: CashFlowMonth[];
  risks: RiskItem[];
  confidenceScore: number;
  confidenceReason: string;
  efficiencyTips: string[];
  summary: string;
}

export interface ScenarioComparison {
  economy: EstimationResult;
  standard: EstimationResult;
  premium: EstimationResult;
}

export interface EditableAssumptions {
  materialCostMultiplier: number; // 0.8 = 20% reduction, 1.2 = 20% increase
  laborRateMultiplier: number;
  equipmentCostMultiplier: number;
  contingencyPercentage: number;
}

export interface ReportData {
  projectInputs: ProjectInputs;
  estimation: EstimationResult;
  assumptions: EditableAssumptions;
  generatedAt: Date;
  scenarioComparison?: ScenarioComparison;
}

export interface FeasibilityResult {
  isValid: boolean;
  budgetVerdict: BudgetVerdict;
  issues: string[];
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
}