import React from 'react';
import { ScenarioComparison } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  comparison: ScenarioComparison;
  onSelectScenario: (scenario: 'economy' | 'standard' | 'premium') => void;
}

const ScenarioComparisonTable: React.FC<Props> = ({ comparison, onSelectScenario }) => {
  const scenarios = [
    { key: 'economy' as const, label: 'Essential Build', data: comparison.economy, color: 'blue' },
    { key: 'standard' as const, label: 'Comfort Build', data: comparison.standard, color: 'green' },
    { key: 'premium' as const, label: 'Elite Build', data: comparison.premium, color: 'purple' }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        button: 'bg-blue-600 hover:bg-blue-700',
        badge: 'bg-blue-100 text-blue-800'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        button: 'bg-green-600 hover:bg-green-700',
        badge: 'bg-green-100 text-green-800'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        button: 'bg-purple-600 hover:bg-purple-700',
        badge: 'bg-purple-100 text-purple-800'
      }
    };
    return colorMap[color as keyof typeof colorMap];
  };

  const standardCost = comparison.standard.totalEstimatedCost;

  const getComparisonIcon = (cost: number) => {
    if (cost < standardCost) return <TrendingDown className="w-4 h-4 text-green-600" />;
    if (cost > standardCost) return <TrendingUp className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getPercentageDiff = (cost: number) => {
    const diff = ((cost - standardCost) / standardCost) * 100;
    return diff.toFixed(1);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-1 h-7 bg-indigo-500 rounded-full"></div>
          Scenario Comparison
        </h3>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          One-click comparison
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((scenario) => {
          const colors = getColorClasses(scenario.color);
          const percentDiff = getPercentageDiff(scenario.data.totalEstimatedCost);

          return (
            <div
              key={scenario.key}
              className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-lg font-bold ${colors.text}`}>{scenario.label}</h4>
                <div className="flex items-center gap-2">
                  {getComparisonIcon(scenario.data.totalEstimatedCost)}
                  <span className={`text-sm font-medium ${colors.badge} px-2 py-1 rounded-full`}>
                    {percentDiff}%
                  </span>
                </div>
              </div>

              {/* Total Cost */}
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-1">Total Cost</p>
                <p className={`text-2xl font-bold ${colors.text}`}>
                  {scenario.data.currencySymbol} {scenario.data.totalEstimatedCost.toLocaleString()}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Confidence</span>
                  <span className="font-semibold text-slate-800">{scenario.data.confidenceScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Timeline</span>
                  <span className="font-semibold text-slate-800">{scenario.data.cashflow.length} months</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Risk Level</span>
                  <span className="font-semibold text-slate-800">
                    {scenario.data.risks.filter(r => r.impact === 'High').length > 0 ? 'High' :
                     scenario.data.risks.filter(r => r.impact === 'Medium').length > 0 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>

              {/* Top 3 Cost Categories */}
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-2">Top Cost Categories</p>
                <div className="space-y-2">
                  {scenario.data.breakdown
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 truncate">{item.category}</span>
                        <span className="font-medium text-slate-800">
                          {scenario.data.currencySymbol} {item.cost.toLocaleString()}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Select Button */}
              <button
                onClick={() => onSelectScenario(scenario.key)}
                className={`w-full ${colors.button} text-white font-semibold py-3 px-4 rounded-lg transition-colors`}
              >
                Select {scenario.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Summary Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Feature</th>
              <th className="text-center py-3 px-4 font-semibold text-blue-700">Essential Build</th>
              <th className="text-center py-3 px-4 font-semibold text-green-700">Comfort Build</th>
              <th className="text-center py-3 px-4 font-semibold text-purple-700">Elite Build</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 px-4 font-medium text-slate-700">Materials Quality</td>
              <td className="text-center py-3 px-4 text-slate-600">Basic</td>
              <td className="text-center py-3 px-4 text-slate-600">Standard</td>
              <td className="text-center py-3 px-4 text-slate-600">Premium</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 px-4 font-medium text-slate-700">Finishes</td>
              <td className="text-center py-3 px-4 text-slate-600">Basic</td>
              <td className="text-center py-3 px-4 text-slate-600">Mid-range</td>
              <td className="text-center py-3 px-4 text-slate-600">High-end</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 px-4 font-medium text-slate-700">Labor Skill</td>
              <td className="text-center py-3 px-4 text-slate-600">Standard</td>
              <td className="text-center py-3 px-4 text-slate-600">Skilled</td>
              <td className="text-center py-3 px-4 text-slate-600">Expert</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700">Warranty</td>
              <td className="text-center py-3 px-4 text-slate-600">1 year</td>
              <td className="text-center py-3 px-4 text-slate-600">2 years</td>
              <td className="text-center py-3 px-4 text-slate-600">5 years</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScenarioComparisonTable;
