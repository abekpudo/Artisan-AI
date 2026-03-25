import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Hammer, 
  ShieldAlert, 
  Wrench, 
  Lightbulb, 
  History, 
  ChevronRight, 
  Loader2, 
  WifiOff,
  Trash2,
  ArrowLeft,
  Mic,
  MicOff,
  RefreshCw,
  XCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';
import { ArtisanGuide } from './types';
import { generateArtisanGuide, fetchYouTubeVideo } from './services/artisanService';
import { ErrorBoundary } from './components/ErrorBoundary';

const SkeletonGuide = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-4 w-24 bg-stone-200 rounded" />
    <div className="space-y-2">
      <div className="h-10 w-3/4 bg-stone-200 rounded-lg" />
      <div className="h-4 w-48 bg-stone-200 rounded" />
    </div>
    <div className="h-24 bg-orange-100 rounded-2xl" />
    <div className="space-y-4">
      <div className="h-4 w-32 bg-stone-200 rounded px-2" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-stone-200 rounded-3xl" />
      ))}
    </div>
    <div className="h-32 bg-stone-800 rounded-3xl" />
  </div>
);

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentGuide, setCurrentGuide] = useState<ArtisanGuide | null>(null);
  const [history, setHistory] = useState<ArtisanGuide[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [view, setView] = useState<'home' | 'guide' | 'history'>('home');
  const [isListening, setIsListening] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<ArtisanGuide | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fuse = useMemo(() => new Fuse(history, {
    keys: ['title', 'tools', 'steps.title'],
    threshold: 0.4,
  }), [history]);

  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return history;
    return fuse.search(historySearchQuery).map(result => result.item);
  }, [historySearchQuery, history, fuse]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('artisan_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const saveToHistory = (guide: ArtisanGuide) => {
    const newHistory = [guide, ...history.filter(h => h.title !== guide.title)].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('artisan_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (e?: React.FormEvent, retryQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = retryQuery || query;
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setCurrentGuide(null);
    setView('guide');
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const guide = await generateArtisanGuide(searchQuery, abortControllerRef.current.signal);
      
      // Fetch media in parallel
      const [videoId] = await Promise.all([
        fetchYouTubeVideo(guide.youtube_query)
      ]);

      const fullGuide = { ...guide, videoId };
      setCurrentGuide(fullGuide);
      saveToHistory(fullGuide);
      setQuery('');
    } catch (error: any) {
      if (error.message === 'Aborted') {
        console.log("Search aborted by user");
        setView('home');
      } else {
        console.error("Error generating guide:", error);
        alert("Abeg, something went wrong. Check your connection.");
        setView('home');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Abeg, your browser no support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG'; // Nigerian English/Pidgin support
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(undefined, transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleDelete = (guide: ArtisanGuide) => {
    setGuideToDelete(guide);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!guideToDelete) return;
    const newHistory = history.filter(h => h.id !== guideToDelete.id);
    setHistory(newHistory);
    localStorage.setItem('artisan_history', JSON.stringify(newHistory));
    setShowDeleteConfirm(false);
    setGuideToDelete(null);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    const newHistory = history.map(h => h.id === id ? { ...h, feedback: type } : h);
    setHistory(newHistory);
    localStorage.setItem('artisan_history', JSON.stringify(newHistory));
    if (currentGuide?.id === id) {
      setCurrentGuide({ ...currentGuide, feedback: type });
    }
  };

  const handleShare = async () => {
    if (!currentGuide) return;
    
    const shareText = `Master Artisan AI Guide: ${currentGuide.title}\n\nSafety: ${currentGuide.safety}\n\nSteps:\n${currentGuide.steps.map(s => `${s.step}. ${s.instruction}`).join('\n')}\n\nPro Tip: ${currentGuide.pro_tip}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentGuide.title,
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Guide copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-orange-200">
        {/* Offline Banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-600 text-white text-xs py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50"
            >
              <WifiOff size={14} />
              <span>You are offline. Viewing saved guides only.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('home')}
            aria-label="Go to Home"
          >
            <div className="bg-orange-600 p-1.5 rounded-lg text-white">
              <Hammer size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Oga AI</h1>
          </div>
          
          <button 
            onClick={() => setView('history')}
            aria-label="View Search History"
            className="p-2 hover:bg-stone-100 rounded-full transition-colors relative"
          >
            <History size={20} />
            {history.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-600 rounded-full border border-white"></span>
            )}
          </button>
        </header>

        <main className={`mx-auto p-4 pb-24 ${view === 'guide' ? 'max-w-6xl' : 'max-w-2xl'}`}>
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 pt-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-stone-900 leading-tight">
                    Wetin you wan <span className="text-orange-600 underline decoration-wavy underline-offset-4">learn</span> today?
                  </h2>
                  <p className="text-stone-500 text-sm">Practical guides for Nigerian artisans.</p>
                </div>

                <div className="space-y-4">
                  <form onSubmit={handleSearch} className="relative group">
                    <input 
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. How to fix generator, Tiling basics..."
                      disabled={isOffline || loading}
                      aria-label="Search for a trade or skill"
                      className="w-full bg-white border-2 border-stone-200 rounded-2xl py-4 pl-12 pr-32 focus:border-orange-600 focus:outline-none transition-all shadow-sm group-hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                    
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {query && !loading && (
                        <button 
                          type="button"
                          onClick={() => setQuery('')}
                          aria-label="Clear search"
                          className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={handleVoiceSearch}
                        disabled={loading || isOffline}
                        aria-label={isListening ? "Stop voice search" : "Start voice search"}
                        className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-stone-400 hover:bg-stone-100'}`}
                      >
                        <Mic size={20} />
                      </button>
                      <button 
                        type="submit"
                        disabled={loading || isOffline}
                        aria-label="Search"
                        className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                      </button>
                    </div>
                  </form>

                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 py-8"
                    >
                      <div className="text-stone-500 text-sm animate-pulse">Master Artisan is thinking...</div>
                      <button 
                        onClick={stopSearch}
                        aria-label="Stop current search"
                        className="flex items-center gap-2 text-red-600 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={18} />
                        Stop Search
                      </button>
                    </motion.div>
                  )}
                </div>

                {history.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Recent Guides</h3>
                    <div className="grid gap-3">
                      {history.slice(0, 3).map((guide) => (
                        <button
                          key={guide.id}
                          onClick={() => { setCurrentGuide(guide); setView('guide'); }}
                          aria-label={`View guide for ${guide.title}`}
                          className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 hover:border-orange-600 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                              <Wrench size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-stone-800">{guide.title}</p>
                              <p className="text-xs text-stone-400">{formatDate(guide.timestamp)}</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-stone-300 group-hover:text-orange-600 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'guide' && (
              <motion.div 
                key="guide"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setView('home')}
                    aria-label="Back to search"
                    className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft size={16} />
                    Back to search
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleShare}
                      aria-label="Share this guide"
                      className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                      title="Share Guide"
                    >
                      <Share2 size={20} />
                    </button>
                    <button 
                      onClick={() => setShowRefreshConfirm(true)}
                      disabled={loading || isOffline}
                      aria-label="Refresh this guide"
                      className="flex items-center gap-2 text-orange-600 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {loading ? (
                  <SkeletonGuide />
                ) : currentGuide && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black text-stone-900 leading-none">{currentGuide.title}</h2>
                        <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                          <span className="bg-stone-200 px-2 py-0.5 rounded">OFFLINE READY</span>
                          <span>•</span>
                          <span>{formatDate(currentGuide.timestamp)}</span>
                        </div>
                      </div>

                      {/* Video Player Section */}
                      {currentGuide.videoId && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-stone-400 font-bold uppercase text-xs tracking-widest px-2">
                            <ExternalLink size={16} />
                            Video Tutorial
                          </div>
                          <div className="aspect-video bg-stone-900 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${currentGuide.videoId}`}
                              title={`Video tutorial for ${currentGuide.title}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          </div>
                        </div>
                      )}

                      {/* Steps Section */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest px-2">Step-by-Step Guide</h3>
                        <div className="space-y-3">
                          {currentGuide.steps.map((step) => (
                            <div key={step.step} className="bg-white border border-stone-200 rounded-3xl p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                              <div className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 text-sm">
                                {step.step}
                              </div>
                              <p className="text-stone-800 leading-relaxed pt-1">{step.instruction}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Feedback Mechanism */}
                      <div className="flex items-center justify-center gap-4 py-8 border-t border-stone-200">
                        <span className="text-sm text-stone-500 font-medium">Was this helpful?</span>
                        <button 
                          onClick={() => handleFeedback(currentGuide.id, 'up')}
                          aria-label="Helpful"
                          className={`p-3 rounded-2xl transition-all ${currentGuide.feedback === 'up' ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                        >
                          <ThumbsUp size={24} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(currentGuide.id, 'down')}
                          aria-label="Not helpful"
                          className={`p-3 rounded-2xl transition-all ${currentGuide.feedback === 'down' ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                        >
                          <ThumbsDown size={24} />
                        </button>
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Safety Section */}
                      <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-3xl space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 text-orange-700 font-bold uppercase text-xs tracking-tighter">
                          <ShieldAlert size={20} />
                          Safety First (Abeg read!)
                        </div>
                        <p className="text-orange-900 text-sm leading-relaxed italic font-medium">{currentGuide.safety}</p>
                      </div>

                      {/* Tools Section */}
                      <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-stone-400 font-bold uppercase text-xs tracking-widest">
                          <Wrench size={16} />
                          Tools You Need
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentGuide.tools.map((tool, i) => (
                            <span key={i} className="bg-stone-100 text-stone-700 px-3 py-1.5 rounded-xl text-sm font-bold border border-stone-200">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pro Tip */}
                      <div className="bg-stone-900 text-white p-6 rounded-3xl space-y-3 shadow-xl relative overflow-hidden">
                        <div className="relative z-10 flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-widest">
                          <Lightbulb size={16} />
                          Master Artisan Pro Tip
                        </div>
                        <p className="relative z-10 text-stone-200 leading-relaxed font-medium italic">"{currentGuide.pro_tip}"</p>
                        <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12">
                          <Lightbulb size={120} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <button 
                    onClick={() => setView('home')}
                    aria-label="Back to home"
                    className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium self-start"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Search your saved guides..."
                      aria-label="Search through saved guides"
                      className="w-full bg-white border border-stone-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-600/20 transition-all"
                    />
                  </div>
                </div>

                <h2 className="font-black text-2xl text-stone-900 uppercase tracking-tighter">Saved Guides</h2>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-stone-300">
                      <History size={32} />
                    </div>
                    <p className="text-stone-400 text-sm font-bold">No saved guides found.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredHistory.map((guide) => (
                      <div 
                        key={guide.id}
                        className="group relative bg-white border border-stone-200 rounded-2xl p-4 hover:border-orange-600 transition-all shadow-sm hover:shadow-md"
                      >
                        <button
                          onClick={() => { setCurrentGuide(guide); setView('guide'); }}
                          aria-label={`View guide for ${guide.title}`}
                          className="flex items-center gap-4 text-left w-full pr-12"
                        >
                          <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors shrink-0">
                            <Wrench size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-stone-800 line-clamp-1 uppercase tracking-tight">{guide.title}</p>
                            <p className="text-xs text-stone-400 font-mono">{formatDate(guide.timestamp)} • {guide.steps.length} steps</p>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleDelete(guide)}
                          aria-label={`Delete ${guide.title} from history`}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-stone-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Action Button for Search */}
        {view !== 'home' && !loading && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setView('home')}
            aria-label="New Search"
            className="fixed bottom-6 right-6 w-14 h-14 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-orange-700 transition-all z-50"
          >
            <Search size={24} />
          </motion.button>
        )}

        {/* Confirmation Dialogs */}
        <AnimatePresence>
          {showRefreshConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRefreshConfirm(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
              >
                <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center text-orange-600">
                  <RefreshCw size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900">Refresh Guide?</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    This go generate a fresh version of the guide. You sure say you wan refresh?
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowRefreshConfirm(false)}
                    aria-label="Cancel refresh"
                    className="flex-1 px-4 py-3 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors"
                  >
                    No, cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowRefreshConfirm(false);
                      handleSearch(undefined, currentGuide?.title);
                    }}
                    aria-label="Confirm refresh"
                    className="flex-1 px-4 py-3 rounded-2xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                  >
                    Yes, refresh
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
              >
                <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900">Delete Guide?</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    You sure say you wan delete this guide from your history?
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    aria-label="Cancel delete"
                    className="flex-1 px-4 py-3 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors"
                  >
                    No, cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    aria-label="Confirm delete"
                    className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Yes, delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
