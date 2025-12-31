import React, { useState, useEffect, useCallback } from 'react';
import { ProjectType, QualityLevel, ProjectInputs } from '../types';
import { ArrowRight } from 'lucide-react';

interface Props {
  onEstimate: (inputs: ProjectInputs) => void;
}

const EstimatorForm: React.FC<Props> = ({ onEstimate }) => {
  const [inputs, setInputs] = useState<ProjectInputs>({
    type: ProjectType.RESIDENTIAL,
    quality: QualityLevel.STANDARD,
    location: '',
    sizeSqFt: 0,
    floors: 1,
    budgetLimit: 0,
    timelineMonths: 0,
    manpower: 0
  });
  const [error, setError] = useState<string | null>(null);

  const numericFields = ['sizeSqFt', 'floors', 'budgetLimit', 'timelineMonths', 'manpower'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? (value === '' ? 0 : Number(value))
        : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(inputs).some(value => value === '' || value === 0)) {
      setError('Please fill out all fields.');
      return;
    }
    setError(null);
    onEstimate(inputs);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="bg-blue-600 w-2 h-6 rounded-full"></span>
        Project Details
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
          <select
            name="type"
            value={inputs.type}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          >
            {Object.values(ProjectType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quality Level</label>
          <select
            name="quality"
            value={inputs.quality}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          >
            {Object.values(QualityLevel).map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={inputs.location}
            onChange={handleChange}
            placeholder="Enter city name (e.g., Mumbai, New York, London, Tokyo)"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
          <p className="text-xs text-slate-500 mt-1">AI will analyze market rates for any city worldwide with local currency.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Size (Sq Ft)</label>
          <input
            type="number"
            name="sizeSqFt"
            value={inputs.sizeSqFt || ''}
            onChange={handleChange}
            min="1"
            placeholder="1000"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>



        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Floors Needed</label>
          <input
            type="number"
            name="floors"
            value={inputs.floors || ''}
            onChange={handleChange}
            min="1"
            max="100"
            placeholder="1"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget Limit</label>
          <input
            type="number"
            name="budgetLimit"
            value={inputs.budgetLimit || ''}
            onChange={handleChange}
            min="1"
            placeholder="3500000"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timeline (Months)</label>
          <input
            type="number"
            name="timelineMonths"
            value={inputs.timelineMonths || ''}
            onChange={handleChange}
            min="1"
            max="60"
            placeholder="6"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Available Manpower</label>
          <input
            type="number"
            name="manpower"
            value={inputs.manpower || ''}
            onChange={handleChange}
            min="1"
            max="1000"
            placeholder="5"
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>
      </div>



      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="submit"
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2"
        >
          Generate Estimate <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form >
  );
};

export default EstimatorForm;