import React, { useState, useEffect } from 'react';
import { Upload, ShieldCheck, Search, Cpu, CheckSquare, Loader2, AlertTriangle, Send, FileText, Trash2, Sparkles, MessageSquare } from 'lucide-react';

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [inputHeight, setInputHeight] = useState(60);
  const [showExamples, setShowExamples] = useState(true);

  const API_BASE = "http://localhost:8000";

  const exampleQuestions = [
    "Summarize the key information from this document",
    "What are the main skills and qualifications?",
    "Extract all important dates and deadlines",
    "What are the top 3 achievements mentioned?"
  ];

  useEffect(() => { 
    fetchDocs();
    const interval = setInterval(fetchDocs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    
    try {
      // Call backend to delete from database
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete document from database');
      }
      
      // Update UI after successful backend deletion
      setDocuments(documents.filter(d => d.id !== docId));
      if (selectedDoc === docId) {
        setSelectedDoc(null);
        setResult(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    e.target.style.height = 'auto';
    setInputHeight(Math.min(Math.max(e.target.scrollHeight, 60), 200));
    e.target.style.height = inputHeight + 'px';
  };

  const handleExampleClick = (example) => {
    setQuery(example);
    setShowExamples(false);
  };

  const getDocumentSize = (content) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all files are PDFs
    const invalidFiles = Array.from(files).filter(f => !f.name.endsWith('.pdf'));
    if (invalidFiles.length > 0) {
      setUploadStatus(`Only PDF files are allowed. Invalid: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    let successCount = 0;
    let failedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          successCount++;
          setUploadStatus(`Uploading ${files.length} file(s)... (${successCount}/${files.length} done)`);
        } catch (err) {
          failedFiles.push(`${file.name} (${err.message})`);
        }
      }

      // Refresh documents list
      await fetchDocs();

      if (failedFiles.length === 0) {
        setUploadStatus(`✓ All ${successCount} file(s) uploaded successfully!`);
      } else {
        setUploadStatus(`✓ ${successCount}/${files.length} uploaded. Failed: ${failedFiles.join(', ')}`);
      }

      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setUploadStatus(`✗ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleProcess = async () => {
    if (!selectedDoc) {
      setError('Please select a document first');
      return;
    }

    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setResult(null);
    setTrace([]);
    setError('');
    setShowExamples(false);

    try {
      console.log('Processing query:', { document_id: selectedDoc, query });
      
      const res = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedDoc, query })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('Query response:', data);
      
      setResult(data);
      if (data.trace) setTrace(data.trace);
    } catch (err) {
      console.error('Error processing query:', err);
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 font-sans overflow-hidden">
      <div className="h-screen w-screen grid gap-4 p-4" style={{ gridTemplateColumns: '260px 1fr 320px' }}>
        
        {/* LEFT PANEL - Document Library */}
        <div className="flex flex-col gap-4 h-full overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-emerald-500/15 to-slate-900/40 rounded-xl border border-emerald-500/20 backdrop-blur-sm">
            <div className="bg-emerald-500/30 p-2.5 rounded-lg">
              <ShieldCheck className="text-emerald-400" size={28} />
            </div>
            <div>
              <h1 className="font-bold text-white text-2xl">Agentic Read</h1>
              <p className="text-xs text-emerald-400/70">AI-Powered Q&A</p>
            </div>
          </div>

          {/* Document Library */}
          <div className="flex-1 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-5 rounded-xl border border-slate-700/30 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">📚 Documents</h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
                {documents.length}
              </span>
            </div>
            
            {/* Upload Button */}
            <div className="mb-4 relative">
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
                className="flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-emerald-600/60 to-emerald-500/50 hover:from-emerald-600/70 hover:to-emerald-500/60 border border-emerald-500/80 rounded-lg cursor-pointer transition-all duration-200 group hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <Upload size={18} className="text-emerald-900 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-emerald-950 text-sm">
                  {uploading ? 'Uploading...' : '+ Upload PDF'}
                </span>
              </label>
              {uploadStatus && (
                <p className={`text-xs mt-2 p-3 rounded-lg font-medium animate-in fade-in ${uploadStatus.startsWith('✓') ? 'bg-green-950/60 text-green-300 border border-green-500/30' : 'bg-red-950/60 text-red-300 border border-red-500/30'}`}>
                  {uploadStatus}
                </p>
              )}
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <FileText size={32} className="text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">No documents yet</p>
                  <p className="text-xs text-slate-600 mt-2">Upload a PDF to get started</p>
                </div>
              ) : (
                documents.map(doc => {
                  const filename = doc.metadata?.source || `Document ${doc.id.slice(0, 8)}`;
                  const cleanName = filename.replace(/^.*[\\\/]/, '').replace('.pdf', '');
                  const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
                  const fileSize = getDocumentSize(doc.content || '');
                  
                  return (
                    <button 
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative ${selectedDoc === doc.id ? 'bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md hover:shadow-slate-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText size={16} className={`mt-1 flex-shrink-0 transition-colors ${selectedDoc === doc.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate transition-colors ${selectedDoc === doc.id ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {cleanName}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                            <span>{uploadDate}</span>
                            <span>•</span>
                            <span>{fileSize}</span>
                          </div>
                          <div className="mt-3">
                            <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${selectedDoc === doc.id ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                              Ready
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded-lg transition-all duration-200 text-slate-400 hover:text-red-600"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL - AI Question/Answer */}
        <div className="flex flex-col gap-4 h-full overflow-hidden min-w-0">
          
          {/* Input Area */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/60 border border-slate-700/40 rounded-xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex flex-col gap-4">
              {/* Input with Icon */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-4 text-emerald-400/60">
                    <Sparkles size={18} />
                  </div>
                  <textarea 
                    value={query}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !loading && selectedDoc && handleProcess()}
                    placeholder="Ask anything about your document...&#10;Tip: Press Shift+Enter for new line"
                    disabled={loading}
                    className="w-full bg-slate-800/50 border border-slate-700/60 rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/40 outline-none disabled:opacity-50 transition-all text-sm resize-none placeholder:text-slate-500/80 font-medium"
                    style={{ height: `${inputHeight}px`, minHeight: '60px', maxHeight: '200px' }}
                  />
                </div>
                <button 
                  onClick={handleProcess}
                  disabled={loading || !selectedDoc || !query.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-7 py-3 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] font-medium shadow-lg hover:shadow-emerald-500/40 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>

              {/* Help Text */}
              {!selectedDoc && (
                <p className="text-xs text-amber-300/80 flex items-center gap-2 bg-amber-500/10 px-4 py-2.5 rounded-lg border border-amber-500/30">
                  <AlertTriangle size={14} /> Select a document from the library first
                </p>
              )}
              {error && (
                <p className="text-xs text-red-300 flex items-start gap-2 bg-red-950/50 px-4 py-2.5 rounded-lg border border-red-500/30">
                  <span className="mt-0.5">✗</span> <span>{error}</span>
                </p>
              )}
            </div>
          </div>

          {/* Empty State with Examples */}
          {showExamples && !result && !loading && selectedDoc && (
            <div className="flex-1 bg-gradient-to-br from-slate-900/40 to-slate-950/20 border border-slate-700/30 rounded-xl p-8 flex flex-col items-center justify-center backdrop-blur-sm overflow-auto">
              <div className="text-center max-w-md">
                <div className="mb-4 flex justify-center">
                  <div className="bg-emerald-500/20 p-4 rounded-full border border-emerald-500/30">
                    <MessageSquare className="text-emerald-400" size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">What would you like to know?</h3>
                <p className="text-sm text-slate-400 mb-6">Ask me anything about this document. Here are some ideas:</p>
                
                <div className="space-y-3">
                  {exampleQuestions.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example)}
                      className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/40 hover:border-emerald-500/40 rounded-lg transition-all duration-200 group hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                      <p className="text-sm text-slate-300 group-hover:text-emerald-300 transition-colors">{example}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Answer Display */}
          {result && !loading && (
            <div className="flex-1 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border border-slate-700/40 rounded-xl p-8 backdrop-blur-sm overflow-auto">
              <div className="animate-in fade-in duration-300">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-emerald-400" /> Answer
                </h2>
                <p className="text-base leading-relaxed text-slate-300 mb-8">{result.summary}</p>
                
                {result.key_points && result.key_points.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-4">Key Points</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {result.key_points.map((pt, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/30 rounded-lg border border-slate-700/40 hover:border-emerald-500/40 transition-all group">
                          <span className="text-emerald-400 font-mono font-bold flex-shrink-0 text-sm bg-emerald-500/10 px-2 py-1 rounded h-fit">{String(i+1).padStart(2, '0')}</span>
                          <p className="text-sm text-slate-300">{pt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex-1 bg-gradient-to-br from-slate-900/40 to-slate-950/20 border border-slate-700/30 rounded-xl p-8 flex flex-col items-center justify-center backdrop-blur-sm">
              <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
              <p className="text-slate-300 font-medium">Processing your question...</p>
              <p className="text-xs text-slate-500 mt-2">The agent team is analyzing your document</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Agent Pipeline */}
        <div className="flex flex-col gap-4 h-full overflow-hidden min-w-0">
          <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/50 rounded-xl p-6 backdrop-blur-md shadow-xl flex flex-col overflow-y-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
              <Cpu size={14} className="text-emerald-400" /> Agent Pipeline
            </h2>
            
            <div className="space-y-4 flex-1 relative">
              <div className="absolute left-[17px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500/30 via-slate-700/20 to-transparent"></div>
              
              {[
                { label: 'Security', icon: ShieldCheck, step: 'Gatekeeper', color: 'from-blue-500 to-blue-600' },
                { label: 'Retrieval', icon: Search, step: 'Librarian', color: 'from-purple-500 to-purple-600' },
                { label: 'Reasoning', icon: Cpu, step: 'Analyst', color: 'from-orange-500 to-orange-600' },
                { label: 'Validation', icon: CheckSquare, step: 'Editor', color: 'from-emerald-500 to-emerald-600' }
              ].map((item, i) => {
                const isActive = trace.length > i;
                const isRunning = trace.length === i && loading;
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4 relative z-10 group">
                    <div className={`p-2.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center flex-shrink-0 ${
                      isActive ? `bg-gradient-to-br ${item.color} border-slate-600 shadow-lg shadow-slate-600/20` : 
                      isRunning ? 'bg-slate-700/50 border-slate-600/50 animate-pulse' :
                      'bg-slate-800/30 border-slate-700/50'
                    }`}>
                      {isRunning ? (
                        <Loader2 className="animate-spin text-slate-400" size={14} />
                      ) : (
                        <Icon size={14} className={`${isActive ? 'text-white' : 'text-slate-500'} transition-colors`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold transition-colors duration-200 ${isActive || isRunning ? 'text-slate-100' : 'text-slate-500'}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs transition-colors ${isActive || isRunning ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.step}
                      </p>
                      {isActive && <div className="text-emerald-400 text-xs font-bold mt-1">✓ Complete</div>}
                      {isRunning && <div className="text-slate-400 text-xs mt-1">Processing...</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loading Info */}
            {loading && (
              <div className="mt-6 pt-6 border-t border-slate-700/30">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-500/30 animate-pulse">
                  <Loader2 className="animate-spin" size={14} />
                  <span className="text-xs font-bold uppercase tracking-tight">Analyzing...</span>
                </div>
              </div>
            )}

            {/* Info Card */}
            {!loading && selectedDoc && (
              <div className="mt-6 pt-6 border-t border-slate-700/30">
                <div className="text-xs text-slate-500 space-y-2">
                  <p>🤖 The power of multi-agent AI:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Detects unsafe queries</li>
                    <li>Finds relevant content</li>
                    <li>Reasons through context</li>
                    <li>Validates answers</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;