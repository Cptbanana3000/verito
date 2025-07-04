'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

// Helper component for Icons. Assumes you're using a library like Lucide React,
// but you can replace this with your own icon implementation (e.g., Font Awesome).
// Example: npm install lucide-react
import {
  ShieldCheck,
  Globe,
  FileText,
  Heading1,
  BookText,
  Cpu,
  Timer,
  Link2,
  ExternalLink,
  Users,
  Database,
  FileSignature,
  CalendarCheck,
  Frown,
  Loader,
  Crown,
  Bot,
} from 'lucide-react';

const IconWrapper = ({ icon: Icon, className = '' }) => (
  <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${className}`}>
    <Icon className="w-6 h-6" />
  </div>
);

// Main Card component with a subtle shadow and refined border
const PanelCard = ({ children, className = '', highlight = false }) => (
  <div
    className={`
    bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-sm transition-all duration-300 overflow-hidden
    ${highlight ? 'border-indigo-500/30 shadow-lg' : 'hover:border-gray-300'}
    ${className}
  `}
  >
    {children}
  </div>
);

// Component for displaying key stats with improved layout
const StatDisplay = ({ label, value, icon: Icon, color = 'gray' }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-lg flex items-center gap-4 ${colorClasses[color]}`}>
      <div className="flex-shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};


// A more detailed and visually separated card for each competitor
const CompetitorCard = ({ competitor }) => (
  <PanelCard>
    {/* Card Header */}
    <div className="p-5 border-b border-gray-200/80 flex items-center justify-between bg-gray-50/50">
      <div className="flex items-center gap-4">
        <IconWrapper icon={Globe} className="bg-gray-100 text-gray-600" />
        <div>
          <h4 className="text-lg font-bold text-gray-800">
            <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline transition-colors">
              {new URL(competitor.url).hostname.replace('www.', '')}
            </a>
          </h4>
          <p className="text-gray-500 text-xs truncate max-w-xs">{competitor.url}</p>
        </div>
      </div>
      <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200/80">
        Analyzed
      </div>
    </div>

    {/* Main Content Body */}
    <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left Column: SEO & Content */}
            <div className="md:col-span-3 space-y-4">
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Content & SEO</h5>
                <div className="space-y-3">
                    <InfoItem icon={FileText} label="Page Title" value={competitor.title} />
                    <InfoItem icon={Heading1} label="Main Heading (H1)" value={competitor.h1} />
                    <InfoItem icon={BookText} label="Meta Description" value={competitor.metaDescription} />
                </div>
            </div>

            {/* Right Column: Key Metrics */}
            <div className="md:col-span-2 space-y-4 bg-gray-50/70 p-4 rounded-lg border border-gray-200/60">
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Metrics</h5>
                <div className="space-y-3">
                <StatDisplay icon={FileSignature} label="Word Count" value={competitor.wordCount?.toLocaleString() || 'N/A'} color="indigo" />
                <StatDisplay icon={Timer} label="Page Load Time" value={`${competitor.performance?.pageLoadTime || 'N/A'}s`} color="green" />
                <StatDisplay icon={Link2} label="Internal Links" value={competitor.internalLinks || 'N/A'} color="purple" />
                <StatDisplay icon={ExternalLink} label="External Links" value={competitor.externalLinks || 'N/A'} color="orange" />
                </div>
            </div>
        </div>
    </div>

    {/* Tech Stack Section (Highlighted) */}
    <div className="border-t border-indigo-200/60 px-5 py-4 bg-indigo-50/50">
        <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h5 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">Technology Stack</h5>
        </div>
        <div className="flex flex-wrap gap-2">
            {competitor.technologyStack?.length > 0 ? (
            competitor.technologyStack.slice(0, 10).map((tech) => (
                <span key={tech} className="px-3 py-1.5 bg-white text-indigo-900 text-xs font-semibold rounded-lg border border-indigo-200/80 shadow-sm hover:bg-indigo-50 transition-colors cursor-default">
                    {tech}
                </span>
            ))
            ) : (
            <span className="text-gray-500 text-sm italic">No technologies detected</span>
            )}
        </div>
    </div>
  </PanelCard>
);

// Helper for structured info display
const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/80 transition-colors">
        <Icon className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
        <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500">{label}</p>
            <p className="text-gray-800 font-medium leading-snug">{value || <span className="text-gray-400 italic">Not found</span>}</p>
        </div>
    </div>
);


export default function DeepScanPanel({
  brandName,
  deepScanData,
  deepScanError,
  isDeepScanning,
  onRetry,
}) {
  if (!deepScanData && !deepScanError && !isDeepScanning) {
    return null;
  }

  return (
    <div className="mt-16 sm:mt-24 antialiased">
      <div className="relative isolate px-4 sm:px-6 lg:px-8">
        {/* Background Gradient */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#8085ff] to-[#4f46e5] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-indigo-100/80 rounded-full border border-indigo-200/80">
                <Crown className="w-5 h-5 text-indigo-600" />
                <span className="text-indigo-800 text-sm font-bold tracking-wide">Premium Intelligence</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                Deep Scan Intelligence Report
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                AI-powered competitive analysis with live data and strategic insights to give you the winning edge.
            </p>
        </div>

        {/* Loading State */}
        {isDeepScanning && (
          <PanelCard className="p-8 sm:p-12 text-center flex flex-col items-center" highlight>
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                 <Loader className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Performing Deep Scan...</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Our AI is analyzing competitor websites. This advanced process may take a moment.
            </p>
          </PanelCard>
        )}

        {/* Error State */}
        {deepScanError && (
          <PanelCard className="p-8 sm:p-12 text-center flex flex-col items-center border-red-500/30">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                 <Frown className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-2">Analysis Failed</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              An error occurred during the scan. This can happen due to network issues or restricted access to a site.
            </p>
            <button
              onClick={onRetry}
              className="px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition-all"
            >
              Retry Deep Scan
            </button>
          </PanelCard>
        )}
        
        {/* Results */}
        {deepScanData && (
          <div className="space-y-12">
            {/* Overview Section */}
            <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center sm:text-left">Scan Overview</h2>
                <PanelCard className="p-6" highlight>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatDisplay label="Competitors" value={deepScanData.competitorsAnalyzed?.length || 0} icon={Users} color="indigo"/>
                        <StatDisplay label="Data Points" value={(deepScanData.competitorsAnalyzed?.length || 0) * 16} icon={Database} color="purple"/>
                        <StatDisplay label="Strategic Report" value={deepScanData.comparativeAnalysis ? 'Generated' : 'N/A'} icon={FileSignature} color="green"/>
                        <StatDisplay label="Date" value={deepScanData.timestamp ? new Date(deepScanData.timestamp).toLocaleDateString() : 'N/A'} icon={CalendarCheck} color="orange"/>
                    </div>
                </PanelCard>
            </section>

            {/* Competitor Breakdown Section */}
            <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center sm:text-left">Competitor Breakdown</h2>
                <div className="space-y-6">
                    {deepScanData.competitorsAnalyzed?.map((competitor, index) => (
                        <CompetitorCard key={index} competitor={competitor} />
                    ))}
                </div>
            </section>

            {/* AI Strategic Analysis Section */}
            {deepScanData.comparativeAnalysis && (
              <section>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center sm:text-left">AI Strategic Battle Plan</h2>
                    <PanelCard>
                        <div className="p-6 border-b border-gray-200/80 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <IconWrapper icon={Bot} className="bg-indigo-100 text-indigo-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">AI-Generated Insights</h3>
                                    <p className="text-gray-600">Actionable recommendations based on comparative data.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="prose prose-base max-w-none text-gray-700
                                prose-headings:font-semibold prose-headings:text-gray-800
                                prose-strong:font-semibold prose-strong:text-gray-900
                                prose-a:text-indigo-600 prose-a:font-medium hover:prose-a:text-indigo-700
                                prose-ul:list-disc prose-ul:pl-5
                                prose-p:leading-relaxed">
                            <ReactMarkdown>{deepScanData.comparativeAnalysis}</ReactMarkdown>
                            </div>
                        </div>
                    </PanelCard>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
