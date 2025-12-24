import React, { useState, useEffect, useCallback } from 'react';
import { EditableAssumptions, EstimationResult } from '../types';
import { Settings, RefreshCw, RotateCcw } from 'lucide-react';
import { applyAssumptions } from '../services/reportService';

interface Props {
  baseEstimation: EstimationResult;
  onAssumptionsChange: (assumptions: EditableAssumptions, adjustedEstimation: EstimationResult) => void;
}

const EditableAssumptionsPanel: React.FC<Props> = ({ baseEstimation, onAssumptionsChange }) => {
  const [assumptions, setAssumptions] = useState<EditableAssumptions>({
    materialCostMultiplier: 1.0,
    laborRateMultiplier: 1.0,
    equipmentCostMultiplier: 1.0,
    contingencyPercentage: 10
  });

  const [adjustedEstimation, setAdjustedEstimation] = useState<EstimationResult>(baseEstimation);

  const updateEstimation = useCallback(() => {
    const newEstimation = applyAssumptions(baseEstimation, assumptions);
    setAdjustedEstimation(newEstimation);
    onAssumptionsChange(assumptions, newEstimation);
  }, [baseEstimation, assumptions, onAssumptionsChange]);

  useEffect(() => {
    updateEstimation();
  }, [assumptions, baseEstimation]);

  const handleReset = () => {
    setAssumptions({
      materialCostMultiplier: 1.0,
      laborRateMultiplier: 1.0,
      equipmentCostMultiplier: 1.0,
      contingencyPercentage: 10
    });
  };

  const handleChange = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-1 h-7 bg-orange-500 rounded-full"></div>
          Adjust Assumptions
        </h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Material Cost Multiplier
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={assumptions.materialCostMultiplier}
              onChange={(e) => handleChange('materialCostMultiplier', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5x</span>
              <span className="font-medium">{assumptions.materialCostMultiplier.toFixed(1)}x</span>
              <span>2.0x</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Labor Rate Multiplier
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={assumptions.laborRateMultiplier}
              onChange={(e) => handleChange('laborRateMultiplier', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5x</span>
              <span className="font-medium">{assumptions.laborRateMultiplier.toFixed(1)}x</span>
              <span>2.0x</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Equipment Cost Multiplier
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={assumptions.equipmentCostMultiplier}
              onChange={(e) => handleChange('equipmentCostMultiplier', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5x</span>
              <span className="font-medium">{assumptions.equipmentCostMultiplier.toFixed(1)}x</span>
              <span>2.0x</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contingency Percentage
            </label>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={assumptions.contingencyPercentage}
              onChange={(e) => handleChange('contingencyPercentage', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5%</span>
              <span className="font-medium">{assumptions.contingencyPercentage}%</span>
              <span>25%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Adjusted Total Cost:</span>
          <span className="text-lg font-bold text-slate-900">
            {adjustedEstimation.currencySymbol} {adjustedEstimation.totalEstimatedCost.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Original: {baseEstimation.currencySymbol} {baseEstimation.totalEstimatedCost.toLocaleString()}
          {' '}({((adjustedEstimation.totalEstimatedCost - baseEstimation.totalEstimatedCost) / baseEstimation.totalEstimatedCost * 100).toFixed(1)}% change)
        </div>
      </div>
    </div>
  );
};

export default EditableAssumptionsPanel;