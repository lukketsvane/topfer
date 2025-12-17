import React, { useState, useEffect, useRef } from 'react';
import InputArea from './components/InputArea';
import SpreadCard from './components/SpreadCard';
import { streamSpreadGeneration } from './services/geminiService';
import { SpreadImage } from './types';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'model', content: string}>>([]);
  const [generatedImages, setGeneratedImages] = useState<SpreadImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const checkKey = async () => {
    // Use type assertion to any to bypass the specific type check on window.aistudio
    // This assumes window.aistudio exists at runtime in the intended environment
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      const selected = await win.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
        // Fallback for dev environments without the extension context
        // We assume env var is present or handle error later
        setHasKey(true); 
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleConnect = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      await win.aistudio.openSelectKey();
      // Assume success as per instructions, or recheck
      checkKey();
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      await streamSpreadGeneration(
        text,
        (image) => {
          setGeneratedImages(prev => [...prev, image]);
        },
        (chunkText) => {
            // Optionally log text chunks or show them as status updates
            console.log('Model thought:', chunkText);
        }
      );
    } catch (error) {
      console.error(error);
      alert("Failed to generate spreads. Ensure you have selected a valid API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generatedImages, isLoading]);

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F2F2F7] p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm max-w-sm w-full">
            <h1 className="text-2xl font-semibold mb-2 tracking-tight">SpreadGen</h1>
            <p className="text-gray-500 mb-8 text-[15px] leading-relaxed">
            Connect your Google AI account to start generating academic spreads.
            </p>
            <button
            onClick={handleConnect}
            className="w-full bg-blue-500 text-white font-semibold py-3.5 px-6 rounded-2xl active:scale-95 transition-transform duration-200"
            >
            Connect API Key
            </button>
            <div className="mt-6 text-xs text-gray-400">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                    Billing Information
                </a>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-screen-md mx-auto px-4 pb-32 pt-12">
        
        {/* Intro / Empty State */}
        {messages.length === 0 && generatedImages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] opacity-40 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight text-gray-300 mb-2">SpreadGen</h1>
            <p className="text-gray-400 font-medium">Academic Aesthetics</p>
          </div>
        )}

        {/* User Messages & Generated Spreads Feed */}
        <div className="space-y-8">
            {messages.map((msg, i) => (
                <div key={i} className="flex justify-end mb-4">
                    <div className="bg-blue-500 text-white px-4 py-2.5 rounded-[20px] rounded-br-none max-w-[85%] text-[15px] shadow-sm leading-relaxed">
                        {msg.content}
                    </div>
                </div>
            ))}
            
            {generatedImages.map((img, i) => (
                <SpreadCard key={img.id} image={img} index={i} />
            ))}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </main>

      <InputArea onSend={handleSend} disabled={isLoading} />
    </div>
  );
};

export default App;