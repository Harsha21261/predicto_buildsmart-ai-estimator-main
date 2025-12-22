import React, { useState } from 'react';
import { editSiteImage } from '../services/geminiService';
import { ImagePlus, Wand2, Loader2, Download, AlertCircle } from 'lucide-react';

const Visualizer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;
    setLoading(true);
    setError(null);
    try {
      // Validate data URL format
      if (!selectedImage.startsWith('data:image/') || !selectedImage.includes(',')) {
        throw new Error('Invalid image format - must be a valid data URL');
      }
      
      // Extract base64 part
      const base64Data = selectedImage.split(',')[1];
      const result = await editSiteImage(base64Data, prompt);
      if (result) {
        setGeneratedImage(result);
      } else {
        setError("Image editing is not supported by the current AI model.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image.";
      console.error('Image generation error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-slate-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-purple-600" /> Site Visualizer
        </h2>
        <p className="text-sm text-slate-500">Upload a site photo and use AI to visualize renovations or changes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center p-4 transition-colors ${selectedImage ? 'border-slate-300' : 'border-blue-300 bg-blue-50'}`}>
            {selectedImage ? (
              <img src={selectedImage} alt="Original" className="h-full object-contain" />
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <ImagePlus className="w-10 h-10 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-slate-600">Click to upload site photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Editing Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Add a modern glass facade, remove the debris, add a swimming pool..."
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none h-24 resize-none"
            />
          </div>

          {error && (
             <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
             </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!selectedImage || !prompt || loading}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
            Generate Visualization
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl h-[400px] bg-slate-50 flex items-center justify-center relative overflow-hidden">
          {generatedImage ? (
            <>
              <img src={generatedImage} alt="Generated" className="h-full object-contain" />
              <a 
                href={generatedImage} 
                download="renovation-idea.png"
                className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow hover:bg-slate-100 text-slate-700"
              >
                <Download className="w-5 h-5" />
              </a>
            </>
          ) : (
            <div className="text-center p-6 text-slate-400">
               <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
               <p>AI generated preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
