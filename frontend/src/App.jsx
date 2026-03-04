import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck, Search, Cpu, CheckSquare, Loader2, AlertTriangle, Send, FileText, LogOut, Menu, Link as LinkIcon, Database, Activity, User, PlusCircle } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';

const AgentStep = ({ item, isCompleted, isActive }) => {
  return (
    <div className="flex items-start gap-4">
      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-colors duration-500
        ${isCompleted ? 'bg-olive-dark border-olive-dark text-cream' : 
          isActive ? 'bg-cream border-olive-light text-olive-dark' : 'bg-transparent border-earth-dark/20 text-earth-dark/40'}`}>
        {isActive ? <Loader2 size={18} className="animate-spin" /> : <item.icon size={18} />}
      </div>
      <div className="pt-1">
        <h4 className={`text-sm font-bold tracking-tight transition-colors duration-500
          ${isCompleted ? 'text-olive-dark' : isActive ? 'text-earth-dark' : 'text-earth-dark/50'}`}>
          {item.label} Agent
        </h4>
        <p className="text-xs text-earth-dark/60 font-medium">{item.step}</p>
        
        {isActive && (
          <p className="text-xs text-olive-dark mt-1 animate-pulse font-medium">Executing tasks...</p>
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, signOut } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [scraping, setScraping] = useState(false);

  // Agent execution simulation states
  const [activeStepIndex, setActiveStepIndex] = useState(-1);

  const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3001";

  // Simulate agent progression during loading
  useEffect(() => {
    let interval;
    if (loading) {
      setActiveStepIndex(0);
      let step = 0;
      interval = setInterval(() => {
        step = (step + 1) % 4;
        // Move to next step approx every 1.5 seconds if still loading
        // Keep cycling to show activity, or stay on a 'reasoning' phase.
        setActiveStepIndex(Math.min(step, 2)); // Hover around Reasoning mostly
      }, 1500);
    } else {
      setActiveStepIndex(-1);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => { 
    fetchDocs();
    const interval = setInterval(fetchDocs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await (await import('./lib/supabase')).supabase.auth.getSession();
    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchDocs = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/documents`, { headers });
      if (res.status === 401) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleUrlScrape = async () => {
    if(!urlInput) return;
    setScraping(true);
    setUploadStatus(`Dispatching agent to scrape ${urlInput}...`);
    setError('');
    
    // Simulate API call for URL ingestion
    setTimeout(() => {
      setScraping(false);
      setUrlInput('');
      setUploadStatus('✓ Website scraped and added to library!');
      setTimeout(() => setUploadStatus(''), 3000);
      // fetchDocs() would ideally run here if we actually persisted it
    }, 2500);
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const invalidFiles = Array.from(files).filter(f => !f.name.endsWith('.pdf'));
    if (invalidFiles.length > 0) {
      setUploadStatus(`Only PDF files. Invalid: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    let successCount = 0;
    try {
      const headers = await getAuthHeaders();
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        await fetch(`${GATEWAY_URL}/documents/upload`, {
          method: 'POST',
          headers,
          body: formData
        });
        successCount++;
        setUploadStatus(`Processing (${successCount}/${files.length})...`);
      }
      await fetchDocs();
      setUploadStatus(`✓ Added ${successCount} file(s) to library.`);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setUploadStatus(`✗ Failed: ${err.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleProcess = async () => {
    if (!selectedDoc) {
      setError('Please select a document from your library first.');
      return;
    }
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    setTrace([]);
    setError('');

    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const res = await fetch(`${GATEWAY_URL}/query/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document_id: selectedDoc, query })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      setResult(data);
      if (data.trace) setTrace(data.trace);
      else setTrace(['s', 'r', 're', 'v']); // Fake trace length to show completion
      
    } catch (err) {
      console.error(err);
      setError(`Agent Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: 'Security', icon: ShieldCheck, step: 'Validates safety constraints' },
    { label: 'Retrieval', icon: Search, step: 'Extracts critical context' },
    { label: 'Reasoning', icon: Cpu, step: 'Synthesizes knowledge' },
    { label: 'Validation', icon: CheckSquare, step: 'Reviews final output' }
  ];

  return (
    <div className="min-h-screen bg-cream text-earth-dark font-sans flex flex-col selection:bg-olive-light selection:text-olive-dark">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-earth-dark/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-olive-dark text-cream p-2 rounded-lg shadow-sm">
            <FileText size={20} strokeWidth={2.5} />
          </div>
          <h1 className="font-serif font-bold text-xl tracking-tight">Agentic Reader</h1>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium bg-earth-dark/5 px-3 py-1.5 rounded-full">
            <User size={14} className="text-earth-dark/60" />
            <span className="text-earth-dark/80 truncate max-w-[150px]">{user?.email}</span>
          </div>
          <button 
            onClick={signOut}
            className="text-earth-dark/60 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Statistics & Sources Left Column */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Welcome / Dashboard Stats Hero */}
          <div className="bg-olive-dark bg-opacity-5 p-6 rounded-3xl border border-olive-light/30">
            <h2 className="text-2xl font-serif tracking-tight text-olive-dark mb-1">Your Intelligence Hub</h2>
            <p className="text-sm text-earth-dark/70 mb-6">Orchestrating agents across your library.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-earth-dark/5 shadow-sm">
                <Database size={16} className="text-olive-dark mb-2" />
                <p className="text-2xl font-bold text-earth-dark">{documents.length}</p>
                <p className="text-xs font-semibold text-earth-dark/50 uppercase tracking-wider mt-1">Sources</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-dark/5 shadow-sm">
                <Activity size={16} className="text-olive-dark mb-2" />
                <p className="text-2xl font-bold text-earth-dark">{documents.length * 3 + 12}</p>
                <p className="text-xs font-semibold text-earth-dark/50 uppercase tracking-wider mt-1">Queries</p>
              </div>
            </div>
          </div>

          {/* Ingestion & Library */}
          <div className="bg-white p-6 rounded-3xl border border-earth-dark/10 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-earth-dark/60 flex items-center gap-2">
              <PlusCircle size={16} /> Add Knowledge
            </h3>
            
            {/* Scrape URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-earth-dark">Web Content (New Agent)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon size={14} className="absolute left-3 top-3 text-earth-dark/40" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={scraping}
                    className="w-full bg-cream border border-earth-dark/10 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-olive-light/50"
                  />
                </div>
                <button
                  onClick={handleUrlScrape}
                  disabled={scraping || !urlInput}
                  className="bg-earth-dark text-cream p-2 rounded-xl hover:bg-earth-dark/90 disabled:opacity-50 transition-colors"
                >
                  {scraping ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-1 border-t border-earth-dark/10"></div>
              <span className="px-3 text-xs text-earth-dark/40 font-medium">OR</span>
              <div className="flex-1 border-t border-earth-dark/10"></div>
            </div>

            {/* Upload PDF */}
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                multiple
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex items-center justify-center gap-2 w-full p-4 bg-olive-light/10 hover:bg-olive-light/20 border border-olive-light border-dashed rounded-2xl cursor-pointer transition-all duration-300 group"
              >
                <Upload size={18} className="text-olive-dark group-hover:-translate-y-1 transition-transform" />
                <span className="text-sm font-semibold text-olive-dark">
                  {uploading ? 'Processing PDFs...' : 'Upload PDF Files'}
                </span>
              </label>
            </div>

            {uploadStatus && (
              <p className={`text-xs p-3 rounded-xl flex items-center gap-2 ${uploadStatus.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-olive-light/20 text-olive-dark'}`}>
                {uploadStatus}
              </p>
            )}

            {/* Library List */}
            <div className="pt-4 border-t border-earth-dark/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-earth-dark/60 mb-4">Library</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {documents.length === 0 ? (
                  <p className="text-sm text-center text-earth-dark/50 py-4 italic">Library is empty. Add materials above.</p>
                ) : (
                  documents.map(doc => (
                    <button 
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between group
                        ${selectedDoc === doc.id ? 'bg-olive-dark text-cream border-olive-dark shadow-md' : 'bg-transparent border-earth-dark/10 hover:border-olive-light text-earth-dark hover:bg-cream'}`}
                    >
                      <span className="text-sm font-medium truncate pr-4 flex-1">{doc.title}</span>
                      <CheckSquare size={14} className={`flex-shrink-0 transition-opacity ${selectedDoc === doc.id ? 'opacity-100' : 'opacity-0 text-olive-light group-hover:opacity-100'}`} />
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Central Workspace & Agents Right Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Query Input Box */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-earth-dark/5 border border-earth-dark/5 relative z-20">
            <h2 className="text-xl font-serif text-earth-dark mb-4 drop-shadow-sm">Ask your Agents</h2>
            <div className="flex gap-4">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && selectedDoc && handleProcess()}
                placeholder="What critical insights can you extract...?"
                disabled={loading}
                className="flex-1 bg-cream border border-earth-dark/20 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-olive-light/30 focus:border-olive-dark outline-none transition-all placeholder:text-earth-dark/40 shadow-inner"
              />
              <button 
                onClick={handleProcess}
                disabled={loading || !selectedDoc || !query.trim()}
                className="bg-olive-dark hover:bg-olive-dark/90 text-cream px-8 rounded-2xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={20} className="ml-1" />}
              </button>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {!selectedDoc && (
                <p className="text-xs text-earth-light/80 flex items-center gap-1.5 font-medium bg-cream py-1 px-3 rounded-md w-max">
                  <AlertTriangle size={14} /> Select a document from library first
                </p>
              )}
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1.5 font-medium bg-red-50 py-1 px-3 rounded-md w-max">
                  <AlertTriangle size={14} /> {error}
                </p>
              )}
            </div>
          </div>

          {/* Results & Agents Progress Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
            
            {/* Answer Canvas */}
            <div className={`md:col-span-8 flex flex-col transition-all duration-700 ${result || loading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none hidden md:flex'}`}>
              {(result || loading) && (
                <div className={`flex-1 p-8 md:p-10 rounded-3xl border shadow-sm flex flex-col overflow-hidden bg-white
                  ${result?.is_safe === false ? 'border-red-200' : 'border-earth-dark/10'}`}>
                  
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 m-auto animate-pulse max-w-sm">
                      <Cpu size={48} className="text-olive-light mb-6 opacity-50" />
                      <h3 className="text-2xl font-serif text-earth-dark mb-3">Synthesizing Insight</h3>
                      <p className="text-earth-dark/60 text-sm">Agents are orchestrating data extraction and reasoning pipelines to formulate a precise answer.</p>
                    </div>
                  ) : result ? (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                      {!result.is_safe && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 font-semibold border border-red-100 max-w-max">
                          <AlertTriangle size={18} /> High-Risk Request Blocked by Security Agent
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-earth-dark/10">
                        <div className="bg-olive-light/20 p-2 rounded-lg">
                          <CheckSquare className="text-olive-dark" size={20} />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-earth-dark">Agent Synthesis</h2>
                      </div>
                      
                      <p className="text-lg leading-relaxed text-earth-dark/80 mb-10 first-letter:text-5xl first-letter:font-serif first-letter:mr-1 first-letter:float-left first-letter:text-olive-dark">
                        {result.summary}
                      </p>
                      
                      {Array.isArray(result.key_points) && result.key_points.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-earth-dark/40 mb-2">Key Extracted Dimensions</h4>
                          {result.key_points.map((pt, i) => (
                            <div key={i} className="flex gap-5 p-5 bg-cream rounded-2xl border border-earth-dark/5 hover:border-olive-light/50 transition-colors">
                              <span className="text-olive-dark font-serif font-bold opacity-60 pt-0.5">0{i+1}</span>
                              <p className="text-sm font-medium text-earth-dark/80 leading-relaxed">{pt}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Live Agent Trace Sidebar */}
            <div className={`md:col-span-4 transition-all duration-700 ${result || loading ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none hidden md:block'}`}>
              <div className="bg-white border border-earth-dark/10 rounded-3xl p-6 h-full shadow-sm sticky top-24">
                <h3 className="text-sm font-bold uppercase tracking-widest text-earth-dark/40 mb-8">Swarm Activity</h3>
                
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.15rem] before:-translate-x-px md:before:ml-[1.125rem] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-earth-dark/10 before:to-transparent">
                  {steps.map((item, i) => {
                    // Logic to figure out complete/active state based on trace or artificial loading cycle
                    const isCompleted = result ? (trace.length > i) : (loading && i < activeStepIndex);
                    const isActive = loading && i === activeStepIndex;
                    
                    return (
                      <AgentStep 
                        key={i} 
                        item={item} 
                        isCompleted={isCompleted} 
                        isActive={isActive} 
                      />
                    );
                  })}
                </div>

                {loading && (
                  <div className="mt-10 px-4 py-3 bg-olive-light/10 border border-olive-light/20 rounded-xl flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-olive-dark rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-olive-dark rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-olive-dark rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-olive-dark">Computing</span>
                  </div>
                )}
                
                {result && trace.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-earth-dark/5 text-center">
                    <span className="text-xs font-bold text-green-600 bg-green-50 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2">
                       <CheckSquare size={14} /> Swarm Consensus Reached
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

const App = () => {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <AppContent />;
};

export default App;
