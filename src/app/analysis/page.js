// src/app/analysis/page.js - v2.4 (Fixed saved report viewing)
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalysisHistory } from '@/contexts/AnalysisHistoryContext';
import { Navbar } from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ReactMarkdown from 'react-markdown';

export default function AnalysisPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { triggerHistoryRefresh } = useAnalysisHistory();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategory, setNewCategory] = useState('Technology');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [deepScanData, setDeepScanData] = useState(null);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [deepScanError, setDeepScanError] = useState(null);
  
  const intervalRef = useRef(null);
  const requestIdRef = useRef(null); // Track current request to prevent duplicates

  const brandName = searchParams.get('brand');
  const category = searchParams.get('category') || 'Technology';
  const viewMode = searchParams.get('view'); // 'saved' for viewing saved reports

  const categories = [
    { value: 'tech & saas', label: '🖥️ Tech & SaaS' },
    { value: 'e-commerce & retail', label: '🛒 E-commerce & Retail' },
    { value: 'health & wellness', label: '🏥 Health & Wellness' },
    { value: 'creative & design', label: '🎨 Creative & Design' },
    { value: 'games & entertainment', label: '🎮 Games & Entertainment' },
    { value: 'finance & fintech', label: '💰 Finance & Fintech' },
    { value: 'food & beverage', label: '🍕 Food & Beverage' },
    { value: 'travel & hospitality', label: '✈️ Travel & Hospitality' },
    { value: 'education & e-learning', label: '📚 Education & E-learning' },
    { value: 'professional services', label: '🏢 Professional Services' }
  ];

  const loadingStages = useMemo(() => [
    'Initializing analysis...',
    'Analyzing domain availability...',
    'AI analyzing competitors...',
    'AI evaluating SEO difficulty...',
    'Generating strategic insights...',
    'Finalizing AI recommendations...'
  ], []);

  useEffect(() => {
    const loadReport = async () => {
      if (!brandName) {
        setError('No brand name provided');
        setLoading(false);
        return;
      }

      // Reset states
      setAnalysis(null);
      setError(null);
      setLoading(true);
      setIsSearching(false);
      setLoadingStage(0);

      // If viewing a saved report, use the view-report endpoint
      if (viewMode === 'saved') {
        try {
          const token = await user.getIdToken();
          const response = await fetch(`/api/view-report?brandName=${encodeURIComponent(brandName)}&category=${encodeURIComponent(category)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.status === 404) {
            setError('Saved report not found. It may have been deleted or expired.');
            setLoading(false);
            return;
          }

          if (!response.ok) {
            throw new Error('Failed to load saved report');
          }

          const data = await response.json();
          
          // Validate saved report data and provide fallbacks
          const validatedData = {
            brandName: data.brandName || brandName,
            category: data.category || category,
            overallScore: data.overallScore || 0,
            recommendation: data.recommendation || 'No recommendation available.',
            scores: {
              domainStrength: data.scores?.domainStrength || 0,
              competitionIntensity: data.scores?.competitionIntensity || 0,
              seoDifficulty: data.scores?.seoDifficulty || 0,
              ...data.scores
            },
            detailedAnalysis: {
              domainAvailability: data.detailedAnalysis?.domainAvailability || [],
              googleCompetition: {
                topResults: data.detailedAnalysis?.googleCompetition?.topResults || [],
                ...data.detailedAnalysis?.googleCompetition
              },
              ...data.detailedAnalysis
            },
            cached: true,
            source: data.source || 'user_history',
            analysisTime: data.analysisTime || data.date || new Date().toISOString(),
            ...data
          };
          
          setAnalysis(validatedData);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error loading saved report:', err);
          setError('Failed to load saved report. Please try again.');
          setLoading(false);
          return;
        }
      }

      // NEW: Before running a fresh analysis, attempt to load an existing saved report
      try {
        const token = await user.getIdToken();
        const cachedRes = await fetch(`/api/view-report?brandName=${encodeURIComponent(brandName)}&category=${encodeURIComponent(category)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (cachedRes.ok) {
          const cachedData = await cachedRes.json();
          setAnalysis(cachedData);
          setLoading(false);
          // Ensure the URL reflects saved mode for future reloads
          if (viewMode !== 'saved') {
            router.replace(`/analysis?brand=${encodeURIComponent(brandName)}&category=${encodeURIComponent(category)}&view=saved`);
          }
          return;
        }
      } catch (err) {
        // Ignore and proceed to fresh analysis
      }

      // Otherwise, perform fresh analysis (existing logic)
      // Generate unique request ID to prevent duplicate requests
      const currentRequestId = `${brandName}_${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // If a request is already in progress, cancel it
      if (requestIdRef.current) {
        console.log('Canceling previous request to prevent duplicate');
        return;
      }
      
      requestIdRef.current = currentRequestId;

      // Start loading stage progression only for fresh analysis
      intervalRef.current = setInterval(() => {
        setLoadingStage(prev => {
          if (prev < loadingStages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);

      try {
        const apiUrl = `/api/analyze?brandName=${encodeURIComponent(brandName)}&category=${encodeURIComponent(category)}`;
        const options = {};

        if (user) {
          const token = await user.getIdToken();
          options.headers = {
            'Authorization': `Bearer ${token}`,
          };
        } else {
          setError('You must be logged in to perform an analysis.');
          setLoading(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          requestIdRef.current = null;
          return;
        }
        
        const response = await fetch(apiUrl, options);
        
        if (response.status === 403) {
           const data = await response.json();
           throw new Error(data.message || 'Please verify your email to continue.');
        }
        if (response.status === 402) {
           const data = await response.json();
           throw new Error(data.message || 'You have run out of credits.');
        }
        if (!response.ok) {
          throw new Error('Failed to analyze brand name');
        }

        const data = await response.json();
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setAnalysis(data);
        
        // Trigger history refresh if user is logged in (analysis was saved)
        if (user?.uid) {
          triggerHistoryRefresh();
        }
        // Update URL to saved mode so reloads use cached data
        if (viewMode !== 'saved') {
          router.replace(`/analysis?brand=${encodeURIComponent(brandName)}&category=${encodeURIComponent(category)}&view=saved`);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setError(err.message || 'Failed to analyze brand name. Please try again.');
      } finally {
        setLoading(false);
        requestIdRef.current = null;
      }
    };

    // Only run if brand name exists and user is available
    if (brandName && user) {
      loadReport();
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (requestIdRef.current) {
        requestIdRef.current = null;
      }
    };
  }, [brandName, category, user?.uid, viewMode]);

  if (loading || isSearching) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto">
              <svg className="animate-spin w-full h-full" viewBox="0 0 50 50">
                <circle
                  className="opacity-25"
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <circle
                  className="opacity-75"
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="31.416"
                  strokeDashoffset="31.416"
                  style={{
                    animation: 'spin-dash 1.5s ease-in-out infinite',
                  }}
                />
              </svg>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
              {viewMode === 'saved' ? 'Loading Your Report...' : loadingStages[loadingStage]}
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              {viewMode === 'saved' 
                ? 'Retrieving your previously saved analysis report.' 
                : 'Our AI is working hard to provide you with comprehensive insights.'
              }
            </p>
            
            {/* Progress indicator - only show for fresh analysis */}
            {viewMode !== 'saved' && (
              <div className="w-64 mx-auto mt-6">
                <div className="bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Step {loadingStage + 1} of {loadingStages.length}
                </p>
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes spin-dash {
              0% {
                stroke-dasharray: 1, 31.416;
                stroke-dashoffset: 0;
              }
              50% {
                stroke-dasharray: 15.708, 31.416;
                stroke-dashoffset: -7.854;
              }
              100% {
                stroke-dasharray: 15.708, 31.416;
                stroke-dashoffset: -23.562;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="text-red-500 text-xl">No analysis data available</div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCircleStroke = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getRecommendationText = (score) => {
    if (score >= 80) return 'Strong Contender';
    if (score >= 60) return 'Moderate Potential';
    return 'Needs Consideration';
  };

  const handleNewSearch = async () => {
    if (!newBrandName.trim()) return;
    
    setIsSearching(true);
    setLoadingStage(0);
    
    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Start loading stage progression
    intervalRef.current = setInterval(() => {
      setLoadingStage(prev => {
        if (prev < loadingStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500);
    
    // Navigate immediately, let the page handle the loading
    router.push(`/analysis?brand=${encodeURIComponent(newBrandName.trim())}&category=${encodeURIComponent(newCategory)}`);
  };

  const handleDeepScan = async () => {
    if (!user) {
      setDeepScanError('Please log in to perform a deep scan.');
      return;
    }

    // Check user credits before performing deep scan
    try {
      const token = await user.getIdToken();
      const checkResponse = await fetch('/api/user-credits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        const credits = await checkResponse.json();
        if (credits.deepScans <= 0) {
          setDeepScanError('Insufficient Deep Scan credits. Please purchase a credit pack to continue.');
          return;
        }
      } else {
        setDeepScanError('Unable to verify credits. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      setDeepScanError('Unable to verify credits. Please try again.');
      return;
    }

    setIsDeepScanning(true);
    setDeepScanError(null);
    setDeepScanData(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/deep-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          brandName,
          category,
          competitorUrls: analysis?.detailedAnalysis?.googleCompetition?.topResults?.map(r => r.link) || []
        }),
      });

      const data = await response.json();

      if (response.status === 402) {
        setDeepScanError(data.message || 'Insufficient Deep Scan credits.');
      } else if (response.status === 403) {
        setDeepScanError(data.message || 'Please verify your email to continue.');
      } else if (data.success) {
        setDeepScanData(data.data);
      } else {
        setDeepScanError(data.error || 'Deep scan failed. Please try again.');
      }
    } catch (error) {
      console.error('Deep scan error:', error);
      setDeepScanError('An error occurred during deep scan. Please try again.');
    } finally {
      setIsDeepScanning(false);
    }
  };

  const handlePdfExport = async () => {
    if (!user) {
      alert('Please log in to export PDF reports.');
      return;
    }

    if (!analysis) {
      alert('No analysis data available for export.');
      return;
    }

    // Check user credits before exporting PDF
    try {
      const token = await user.getIdToken();
      const checkResponse = await fetch('/api/user-credits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        const credits = await checkResponse.json();
        if (credits.deepScans <= 0) {
          alert('Insufficient Deep Scan credits. PDF exports require 1 Deep Scan credit.');
          return;
        }
      } else {
        alert('Unable to verify credits. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      alert('Unable to verify credits. Please try again.');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisData: analysis,
          brandName,
          category
        }),
      });

      const data = await response.json();

      if (response.status === 402) {
        alert(data.message || 'Insufficient Deep Scan credits for PDF export.');
      } else if (response.status === 403) {
        alert(data.message || 'Please verify your email to continue.');
      } else if (data.success) {
        // Create and download the PDF (simplified - in production use proper PDF generation)
        const blob = new Blob([data.data.html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.filename.replace('.pdf', '.html'); // For demo, download as HTML
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('PDF export started! Check your downloads folder.');
      } else {
        alert(data.message || 'PDF export failed. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('An error occurred during PDF export. Please try again.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-gray-200 antialiased pt-16" style={{
        backgroundColor: '#1a202c',
        backgroundImage: 'linear-gradient(to top right, #1a202c, #2d3748)'
      }}>
      <style jsx>{`
        .hybrid-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease-in-out;
        }
        .hybrid-card:hover {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      
             <div className="w-full p-4 lg:p-8 pt-20 lg:pt-48">
        {/* Header with Search */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white mb-2">Brand Analysis & Verdict</h1>
              <p className="text-sm lg:text-base text-gray-300">Comprehensive analysis for &ldquo;{brandName}&rdquo;</p>
            </div>
            
            {/* Enhanced Search Box with Category */}
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent appearance-none cursor-pointer text-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.2em 1.2em'
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-gray-800 text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNewSearch()}
                  placeholder="Search another brand..."
                  className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent"
                />
                <button
                  onClick={handleNewSearch}
                  disabled={isSearching || !newBrandName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg hover:from-[#5a6fd6] hover:to-[#6a3f9e] focus:outline-none focus:ring-2 focus:ring-[#667eea] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
              {/* Current Analysis Category Display */}
              <div className="text-sm text-gray-400">
                Current analysis: <span className="text-[#667eea] font-medium">{categories.find(c => c.value === category)?.label || category}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 h-full">
          {/* Left Column: Domain */}
          <div className="lg:col-span-1 xl:col-span-1 order-2 lg:order-1">
            <div className="hybrid-card p-4 lg:p-6 h-full flex flex-col">
              <h2 className="text-lg lg:text-xl font-bold mb-4 text-white">Domain</h2>
              <ul className="space-y-2 text-gray-300">
                {analysis.detailedAnalysis.domainAvailability.map((domain, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-sm lg:text-base">
                    <span className="truncate">{domain.domain}</span>
                    <span className={`text-xs flex-shrink-0 ${domain.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                      {domain.isAvailable ? '✓' : '✗'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Middle Column: Metrics & Insights */}
          <div className="lg:col-span-2 xl:col-span-2 flex flex-col gap-4 lg:gap-6 order-1 lg:order-2">
            {/* Overall Score with Animated Circle */}
            <div className="hybrid-card p-4 lg:p-6 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 lg:w-40 lg:h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Animated progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={getCircleStroke(analysis.overallScore)}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - analysis.overallScore / 100)}`}
                    className="transition-all duration-2000 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 8px ${getCircleStroke(analysis.overallScore)}40)`
                    }}
                  />
                </svg>
                {/* Score text in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl lg:text-5xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-base lg:text-lg font-semibold text-gray-300 text-center">{getRecommendationText(analysis.overallScore)}</p>
              
              {/* AI-Powered Recommendation */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400 mb-2">AI Analysis:</p>
                <div className={`text-sm font-medium ${getScoreColor(analysis.overallScore)} leading-relaxed max-w-md mx-auto`}>
                  {analysis.recommendation || 'Analysis complete. Please review the scores above.'}
                </div>
              </div>
            </div>

            {/* Brand Metrics */}
            <div className="hybrid-card p-6">
              <h2 className="text-xl font-bold mb-6 text-white">Brand Metrics</h2>
              <div className="space-y-6">
                {/* Competitor Metric */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Competitor</p>
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${analysis.scores.competitionIntensity}%` }}></div>
                  </div>
                </div>
                {/* SEO Metric */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">SEO</p>
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div className="bg-green-400 h-2.5 rounded-full" style={{ width: `${analysis.scores.seoDifficulty}%` }}></div>
                  </div>
                </div>
                {/* Domain Metric */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Domain</p>
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div className="bg-purple-400 h-2.5 rounded-full" style={{ width: `${analysis.scores.domainStrength}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Strategic Analysis */}
            <div className="hybrid-card p-6">
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <i className="fas fa-brain text-purple-400"></i>
                AI Strategic Analysis
              </h2>
              <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                {analysis.recommendation ? (
                  <ReactMarkdown
                    components={{
                      // Custom styling for elements
                      strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-purple-400 mt-8 mb-4 border-l-4 border-purple-400 pl-4" {...props} />,
                      li: ({node, ...props}) => <li className="flex items-start mb-2 ml-4"><span className="w-2 h-2 bg-purple-400 rounded-full mr-3 mt-2 flex-shrink-0"></span><span {...props} /></li>
                    }}
                  >
                    {analysis.recommendation}
                  </ReactMarkdown>
                ) : (
                  <p>AI analysis is being generated. Please check back in a moment.</p>
                )}
              </div>
            </div>
            
            {/* Deep Scan Button */}
            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={handleDeepScan}
                disabled={isDeepScanning}
                className="bg-blue-500/80 text-white font-bold text-sm px-8 py-3 rounded-lg shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 backdrop-filter backdrop-blur-sm border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeepScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-microscope"></i>
                    Perform Deep Scan
                  </>
                )}
              </button>
              
              <button 
                onClick={handlePdfExport}
                className="bg-purple-500/80 text-white font-bold text-sm px-8 py-3 rounded-lg shadow-lg hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transition-all duration-300 backdrop-filter backdrop-blur-sm border border-white/20 flex items-center gap-2"
              >
                <i className="fas fa-file-pdf"></i>
                Export PDF Report
              </button>
            </div>
          </div>

          {/* Right Column: Google Search Competitors */}
          <div className="lg:col-span-1 xl:col-span-2 order-3">
            <div className="hybrid-card p-4 lg:p-6 h-full flex flex-col">
              <h2 className="text-lg lg:text-xl font-bold mb-4 text-white">Google Search Competitors</h2>
              
              <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                {analysis.detailedAnalysis.googleCompetition.topResults && analysis.detailedAnalysis.googleCompetition.topResults.length > 0 ? (
                  analysis.detailedAnalysis.googleCompetition.topResults.slice(0, 5).map((result, index) => {
                    // --- FIXED: More accurate "Direct Competitor" logic ---
                    const extractRootDomain = (url) => {
                        try {
                            const hostname = new URL(url).hostname;
                            // Extracts 'reddit' from 'www.reddit.com' or 'reddit.co.uk'
                            const parts = hostname.replace(/^www\./, '').split('.');
                            return parts.length > 1 ? parts[0] : parts[0];
                        } catch {
                            return null; // Return null for invalid URLs
                        }
                    };
                    
                    const rootDomain = extractRootDomain(result.link);
                    const isDirectCompetitor = rootDomain?.toLowerCase() === brandName.toLowerCase();
                    
                    return (
                      <div key={index} className="p-4 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-blue-400 hover:underline flex-1">
                            {result.title}
                          </a>
                          {isDirectCompetitor && (
                            <span className="inline-block bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-1 rounded-full border border-red-500/30 whitespace-nowrap">
                              Direct Competitor
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-green-400">{result.link}</p>
                        <p className="mt-2 text-gray-400 text-sm">{result.snippet}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-16 h-16 mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <i className="fas fa-search text-green-400 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Great News!</h3>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
                      No direct competitors found in Google search results. This could indicate a unique opportunity for your brand name!
                    </p>
                    <div className="mt-4 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                      Clear Path Ahead
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deep Scan Results Section */}
        {(deepScanData || deepScanError || isDeepScanning) && (
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <i className="fas fa-microscope text-blue-400"></i>
                Deep Scan Intelligence Report
              </h2>
              <p className="text-gray-300">Advanced AI-powered competitive analysis with scraped data insights</p>
            </div>

            {isDeepScanning && (
              <div className="hybrid-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-xl font-semibold text-white mb-2">Performing Deep Scan...</h3>
                <p className="text-gray-300">Scraping competitor websites and generating AI insights</p>
              </div>
            )}

            {deepScanError && (
              <div className="hybrid-card p-6 border-red-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <i className="fas fa-exclamation-triangle text-red-400 text-xl"></i>
                  <h3 className="text-lg font-semibold text-red-400">Deep Scan Failed</h3>
                </div>
                <p className="text-gray-300">{deepScanError}</p>
                <button 
                  onClick={handleDeepScan}
                  className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {deepScanData && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="hybrid-card p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-chart-bar text-purple-400"></i>
                    Competitive Intelligence Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{deepScanData.competitorsAnalyzed?.length || 0}</div>
                      <div className="text-sm text-gray-300">Competitors Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{(deepScanData.competitorsAnalyzed?.length || 0) * 16}</div>
                      <div className="text-sm text-gray-300">Data Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{deepScanData.comparativeAnalysis ? 1 : 0}</div>
                      <div className="text-sm text-gray-300">Strategic Report</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {deepScanData.timestamp ? new Date(deepScanData.timestamp).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-300">Generated</div>
                    </div>
                  </div>
                </div>

                {/* Individual Competitor Analyses */}
                {deepScanData.competitorsAnalyzed?.map((competitor, index) => (
                  <div key={index} className="hybrid-card overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 p-6 border-b border-white/10">
                      <h4 className="text-xl font-bold text-white flex items-center gap-3">
                        <i className="fas fa-globe text-green-400"></i>
                        Competitor Data: 
                        <a 
                          href={competitor.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:underline ml-2"
                        >
                          {new URL(competitor.url).hostname}
                        </a>
                      </h4>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">{competitor.wordCount}</div>
                          <div className="text-xs text-gray-400">Words</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{competitor.performance?.pageLoadTime || 'N/A'}</div>
                          <div className="text-xs text-gray-400">Load Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-400">{competitor.technologyStack?.length || 0}</div>
                          <div className="text-xs text-gray-400">Technologies</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-yellow-400">{competitor.internalLinks}</div>
                          <div className="text-xs text-gray-400">Internal Links</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div><strong className="text-white">Title:</strong> <span className="text-gray-300">{competitor.title}</span></div>
                        <div><strong className="text-white">H1:</strong> <span className="text-gray-300">{competitor.h1}</span></div>
                        <div><strong className="text-white">Meta Description:</strong> <span className="text-gray-300">{competitor.metaDescription}</span></div>
                        {competitor.technologyStack && competitor.technologyStack.length > 0 && (
                          <div>
                            <strong className="text-white">Tech Stack:</strong> 
                            <div className="flex flex-wrap gap-2 mt-2">
                              {competitor.technologyStack.slice(0, 8).map((tech, techIndex) => (
                                <span key={techIndex} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Strategic Comparative Analysis */}
                {deepScanData.comparativeAnalysis && (
                  <div className="hybrid-card overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-white/10">
                      <h4 className="text-xl font-bold text-white flex items-center gap-3">
                        <i className="fas fa-chess text-purple-400"></i>
                        Strategic Battle Plan
                      </h4>
                    </div>
                    <div className="p-6">
                      <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            // Custom styling for elements
                            strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-bold text-purple-400 mt-8 mb-4 border-l-4 border-purple-400 pl-4" {...props} />,
                            li: ({node, ...props}) => <li className="flex items-start mb-2 ml-4"><span className="w-2 h-2 bg-purple-400 rounded-full mr-3 mt-2 flex-shrink-0"></span><span {...props} /></li>
                          }}
                        >
                          {deepScanData.comparativeAnalysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
} 