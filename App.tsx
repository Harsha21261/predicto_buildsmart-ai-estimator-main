
import React, { useState } from 'react';
import { ProjectInputs, EstimationResult, FeasibilityResult, ProjectType, QualityLevel } from './types';
import EstimatorForm from './components/EstimatorForm';
import ResultsDashboard from './components/ResultsDashboard';
import ChatInterface from './components/ChatInterface';
import { generateConstructionEstimate } from './services/geminiService';
import { LayoutDashboard, MessageSquare, HardHat } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estimator' | 'chat'>('estimator');
  const [loading, setLoading] = useState(false);
  const [estimationResult, setEstimationResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  

  

  
  // Keep track of current inputs for the dashboard comparison
  const [currentInputs, setCurrentInputs] = useState<ProjectInputs>({
    type: ProjectType.RESIDENTIAL,
    quality: QualityLevel.STANDARD,
    location: '',
    sizeSqFt: 1000,
    budgetLimit: 3500000, // Default to 35 Lakhs
    timelineMonths: 6,
    manpower: 5
  });





  const handleEstimate = async (inputs: ProjectInputs) => {
    setLoading(true);
    setEstimationResult(null);
    setCurrentInputs(inputs);
    setError(null);
    try {
      const result = await generateConstructionEstimate(inputs);
      setEstimationResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Estimation error:', errorMessage);
      const isRateLimit = errorMessage.includes('rate limit') || errorMessage.includes('429');
      setError(isRateLimit ? 'Rate limit exceeded. Please wait 30 seconds before generating another estimate.' : `Estimation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">BuildSmart <span className="text-blue-600">AI</span></h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('estimator')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'estimator' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Estimator
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Assistant
              </div>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'estimator' && (
          <div className="space-y-8">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Intelligent Cost Estimation</h2>
              <p className="text-slate-500">
                Powered by AI. Get real-time market insights, 
                feasibility scores, and detailed breakdowns for any global location.
              </p>
            </div>

            {error && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <EstimatorForm 
                  onEstimate={handleEstimate}
                />
              </div>

              <div className="lg:col-span-8">
                 {loading ? (
                   <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
                     <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                     <h3 className="text-lg font-semibold text-slate-800">Analyzing Project...</h3>
                     <p className="text-slate-500 max-w-md mt-2">
                       AI is using "Thinking Mode" to calculate complex costs, analyze risks, and fetch local market data. This may take a moment.
                     </p>
                   </div>
                 ) : estimationResult ? (
                   <ResultsDashboard 
                     result={estimationResult} 
                     location={currentInputs.location}
                     userBudget={currentInputs.budgetLimit}
                   />
                 ) : (
                   <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                     <div className="bg-slate-50 p-4 rounded-full mb-4">
                       <LayoutDashboard className="w-8 h-8 text-slate-400" />
                     </div>
                     <h3 className="text-lg font-medium text-slate-900">No Estimate Generated Yet</h3>
                     <p className="text-slate-500 max-w-sm mt-1">
                       Fill out the project details on the left and click "Generate" to see a comprehensive AI analysis.
                     </p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-2xl mx-auto">
            <ChatInterface />
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} BuildSmart AI Estimator
        </div>
      </footer>
    </div>
  );
};

export default App;