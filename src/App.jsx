import { useState, useEffect, useRef } from 'react';
import { 
  Mail, Phone, MapPin, UploadCloud, 
  FileText, FileDown, Plus, Trash2, Key, 
  Sparkles, Cpu, Briefcase, GraduationCap, Wrench, Info, RefreshCw,
  Globe
} from 'lucide-react';

// Custom inline SVG icons to avoid version inconsistencies in lucide-react brand icons
const Linkedin = ({ size = 11, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = ({ size = 11, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { parseDocx } from './utils/docxParser';
import { parsePdf } from './utils/pdfParser';
import { parseCVHeuristic, parseCVWithAI } from './utils/cvParser';
// import { emptyCVData } from './utils/cvParser';
import { generateDocx } from './utils/docxGenerator';
import './App.css';

const sampleCVData = {
  name: "John Dou",
  title: "Senior Backend Engineer (Node.js)",
  email: "john.dou@example.com",
  phone: "+1-123-456-7890",
  location: "Generic Location",
  linkedin: "linkedin.com/in/johndou",
  github: "github.com/johndou",
  summary: "Results-driven Senior Backend Engineer with 8+ years of experience designing, building, and scaling robust distributed systems and APIs. Expert in Node.js, TypeScript, database optimization, and high-performance server architecture.",
  experience: [
    {
      organization: "Tech Innovations Ltd.",
      role: "Senior Backend Engineer",
      dates: "2021 – Present",
      bullets: [
        "Led the migration of a legacy monolithic service to Node.js/TypeScript microservices, increasing overall throughput by 150%.",
        "Optimized slow-running PostgreSQL database queries, reducing average API response latency by 45%.",
        "Designed and implemented high-throughput message queuing systems using RabbitMQ to handle asynchronous workloads.",
        "Mentored junior developers and established code review practices to maintain high clean-code standards."
      ]
    },
    {
      organization: "Global Solutions Corp.",
      role: "Software Engineer",
      dates: "2018 – 2021",
      bullets: [
        "Developed and maintained RESTful APIs using Express.js and Node.js serving over 50,000 active daily users.",
        "Integrated third-party payment gateways (Stripe, PayPal) with robust transactional error handling.",
        "Wrote comprehensive unit and integration tests using Jest, raising code coverage from 60% to 88%."
      ]
    }
  ],
  education: [
    {
      organization: "International Institute",
      role: "B.Sc. in Computer Science",
      dates: "2014 – 2018",
      bullets: []
    }
  ],
  skills: [
    {
      category: "Languages & Frameworks",
      items: "Node.js, TypeScript, JavaScript (ES6+), Python, Express.js"
    },
    {
      category: "Databases & Queues",
      items: "PostgreSQL, MongoDB, Redis, RabbitMQ"
    },
    {
      category: "Infrastructure & Tools",
      items: "Docker, AWS (S3, Core Infrastructure), Git, Jest"
    }
  ],
  languages: [
    { name: "English", proficiency: "Native" },
    { name: "Spanish", proficiency: "Fluent" }
  ],
  customSections: []
};

function App() {
  const [cvData, setCvData] = useState(null);
  const [, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [apiKey, setApiKey] = useState('');
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionIdToDelete, setSectionIdToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const cvPageRef = useRef(null);

  const updatePageCount = () => {
    if (cvPageRef.current) {
      const pageElement = cvPageRef.current;
      // Temporarily override height to auto to measure content scroll height naturally
      const originalHeight = pageElement.style.height;
      pageElement.style.height = 'auto';
      
      const height = pageElement.scrollHeight;
      
      // Restore original height style
      pageElement.style.height = originalHeight;
      
      // Calculate how many pixels correspond to 297mm (1 A4 page)
      const widthPx = pageElement.offsetWidth || 794;
      const pxPerMm = widthPx / 210;
      const pageHeightPx = 297 * pxPerMm;
      
      // Compute the number of A4 pages, allowing a 5px tolerance to prevent 
      // floating point rounding or sub-pixel rendering from causing an extra page
      const pages = Math.ceil((height - 5) / pageHeightPx);
      setPageCount(Math.max(1, pages));
    }
  };

  const applyPageBreaks = () => {
    const pageElement = cvPageRef.current;
    if (!pageElement) return;

    // Reset top margins so we measure the natural flow
    const breakables = pageElement.querySelectorAll(
      '.cv-section-header, .cv-item-header, .cv-bullets li, .cv-skills-item, .cv-language-item'
    );
    breakables.forEach(el => {
      el.style.marginTop = '';
    });

    const widthPx = pageElement.offsetWidth || 794;
    const pxPerMm = widthPx / 210;
    const pageHeightPx = 297 * pxPerMm;
    const topMarginPx = 8 * pxPerMm; // Increased breathing room at the top of the new page
    const bottomMarginPx = 2 * pxPerMm; // Small safe zone (CSS padding already provides 10mm)

    // Bounding rect relative to top of cv-page
    const pageRect = pageElement.getBoundingClientRect();

    breakables.forEach(el => {
      const rect = el.getBoundingClientRect();
      const relativeTop = rect.top - pageRect.top;
      const relativeBottom = rect.bottom - pageRect.top;

      // Determine thresholds so section and job headers fit with content
      let thresholdPx = 8; 
      if (el.classList.contains('cv-section-header')) {
        thresholdPx = 30; // section header + divider line
      } else if (el.classList.contains('cv-item-header')) {
        thresholdPx = 20; // job header + first bullet point
      }

      const pageTop = Math.floor(relativeTop / pageHeightPx);
      const pageStartPx = pageTop * pageHeightPx;
      const activeEndPx = pageStartPx + pageHeightPx - bottomMarginPx;

      // Check if element overflows the active content area of the current page
      if (relativeBottom + thresholdPx > activeEndPx) {
        // Push completely to the active start of the next page
        const nextPageStartPx = (pageTop + 1) * pageHeightPx + topMarginPx;
        const neededMarginPx = nextPageStartPx - relativeTop;
        el.style.marginTop = `${neededMarginPx}px`;
      } else if (pageTop > 0 && relativeTop < pageStartPx + topMarginPx) {
        // Element is on pageTop (not page 0) but starts inside the top margin zone.
        // Push it down to the active start of this page.
        const targetTopPx = pageStartPx + topMarginPx;
        const neededMarginPx = targetTopPx - relativeTop;
        el.style.marginTop = `${neededMarginPx}px`;
      }
    });

    // Update A4 discrete page snaps height in the frame
    updatePageCount();
  };

  useEffect(() => {
    if (cvData) {
      const timer = setTimeout(() => {
        applyPageBreaks();
      }, 150); // slight delay to allow layout reflow and rendering
      return () => clearTimeout(timer);
     

    }
  }, [cvData, activeTab]);

  // Handle window resizing as page ratios change
  useEffect(() => {
     

    window.addEventListener('resize', applyPageBreaks);
    return () => window.removeEventListener('resize', applyPageBreaks);
  }, [cvData]);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(savedKey);
    }
  }, []);

  const handleApiKeyChange = (e) => {
    const value = e.target.value;
    setApiKey(value);
    localStorage.setItem('gemini_api_key', value);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setIsLoading(true);
    setError('');
    setCvData(null);
    setRawText('');

    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'docx' && extension !== 'pdf') {
      setError('Unsupported file type. Please upload a .docx or .pdf file.');
      setIsLoading(false);
      return;
    }

    try {
      let text = '';
      let parsedData;

      // If AI is enabled and we have an API key, let Gemini do the heavy lifting
      if (isAIEnabled && apiKey) {
        try {
          if (extension === 'pdf') {
            // For PDFs with AI, we pass the raw file to leverage native OCR
            parsedData = await parseCVWithAI(file, apiKey);
          } else {
            // For DOCX, we still need local text extraction first
            text = await parseDocx(file);
            setRawText(text);
            parsedData = await parseCVWithAI(text, apiKey);
          }
        } catch (aiErr) {
          console.warn('AI Parsing failed, falling back to local extraction:', aiErr);
          setError(`AI parsing failed (${aiErr.message}). Fallback applied.`);
          // If AI fails, we must do full local extraction
          if (extension === 'pdf') {
            text = await parsePdf(file);
          } else if (!text) {
            text = await parseDocx(file);
          }
          setRawText(text);
          parsedData = parseCVHeuristic(text);
        }
      } else {
        // AI is disabled, strictly local extraction
        if (extension === 'docx') {
          text = await parseDocx(file);
        } else {
          // parsePdf will now handle both native text extraction and fallback OCR via tesseract.js
          text = await parsePdf(file);
        }
        setRawText(text);
        parsedData = parseCVHeuristic(text);
      }

      setCvData(parsedData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during CV parsing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (section, index, field, value) => {
    if (section === 'personal') {
      setCvData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (section === 'summary') {
      setCvData(prev => ({
        ...prev,
        summary: value
      }));
    } else {
      setCvData(prev => {
        const updatedSection = [...prev[section]];
        updatedSection[index][field] = value;
        return {
          ...prev,
          [section]: updatedSection
        };
      });
    }
  };

  // Repeated Section Handlers (Experience, Education, Skills, Languages)
  const addRepeatedItem = (section) => {
    setCvData(prev => {
      let newItem;
      if (section === 'experience') {
        newItem = { organization: '', role: '', dates: '', bullets: [''] };
      } else if (section === 'education') {
        newItem = { organization: '', role: '', dates: '', bullets: [] };
      } else if (section === 'skills') {
        newItem = { category: '', items: '' };
      } else if (section === 'languages') {
        newItem = { name: '', proficiency: '' };
      }
      return {
        ...prev,
        [section]: [...(prev[section] || []), newItem]
      };
    });
  };

  const removeRepeatedItem = (section, index) => {
    setCvData(prev => {
      const updatedList = prev[section].filter((_, i) => i !== index);
      return {
        ...prev,
        [section]: updatedList
      };
    });
  };

  // Experience Bullet Handlers
  const handleBulletChange = (jobIndex, bulletIndex, value) => {
    setCvData(prev => {
      const updatedExp = [...prev.experience];
      updatedExp[jobIndex].bullets[bulletIndex] = value;
      return {
        ...prev,
        experience: updatedExp
      };
    });
  };

  const addBullet = (jobIndex) => {
    setCvData(prev => {
      const updatedExp = [...prev.experience];
      updatedExp[jobIndex].bullets.push('');
      return {
        ...prev,
        experience: updatedExp
      };
    });
  };

  const removeBullet = (jobIndex, bulletIndex) => {
    setCvData(prev => {
      const updatedExp = [...prev.experience];
      updatedExp[jobIndex].bullets = updatedExp[jobIndex].bullets.filter((_, i) => i !== bulletIndex);
      return {
        ...prev,
        experience: updatedExp
      };
    });
  };

  // Custom Sections Helper Handlers
  const handleAddCustomSection = () => {
    setNewSectionTitle('');
    setIsAddSectionModalOpen(true);
  };

  const handleConfirmAddSection = (e) => {
    if (e) e.preventDefault();
    if (!newSectionTitle || !newSectionTitle.trim()) {
      setIsAddSectionModalOpen(false);
      return;
    }
    
    const newId = 'custom_' + Date.now();
    setCvData(prev => {
      const customSections = prev.customSections || [];
      return {
        ...prev,
        customSections: [
          ...customSections,
          {
            id: newId,
            title: newSectionTitle.trim(),
            items: [
              { title: '', subtitle: '', date: '', bullets: [''] }
            ]
          }
        ]
      };
    });
    setActiveTab(newId);
    setIsAddSectionModalOpen(false);
  };

  const handleRemoveCustomSection = (sectionId) => {
    setSectionIdToDelete(sectionId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSection = () => {
    if (!sectionIdToDelete) return;
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).filter(sec => sec.id !== sectionIdToDelete)
    }));
    setActiveTab('personal');
    setIsDeleteModalOpen(false);
    setSectionIdToDelete(null);
  };

  const handleCustomSectionTitleChange = (sectionId, newTitle) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => 
        sec.id === sectionId ? { ...sec, title: newTitle } : sec
      )
    }));
  };

  const handleCustomSectionItemChange = (sectionId, itemIdx, field, value) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const updatedItems = [...sec.items];
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          [field]: value
        };
        return {
          ...sec,
          items: updatedItems
        };
      })
    }));
  };

  const addCustomSectionItem = (sectionId) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: [
            ...sec.items,
            { title: '', subtitle: '', date: '', bullets: [''] }
          ]
        };
      })
    }));
  };

  const removeCustomSectionItem = (sectionId, itemIdx) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.filter((_, i) => i !== itemIdx)
        };
      })
    }));
  };

  const handleCustomSectionBulletChange = (sectionId, itemIdx, bulletIdx, value) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const updatedItems = [...sec.items];
        const updatedBullets = [...updatedItems[itemIdx].bullets];
        updatedBullets[bulletIdx] = value;
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          bullets: updatedBullets
        };
        return {
          ...sec,
          items: updatedItems
        };
      })
    }));
  };

  const addCustomSectionBullet = (sectionId, itemIdx) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const updatedItems = [...sec.items];
        const updatedBullets = [...(updatedItems[itemIdx].bullets || [])];
        updatedBullets.push('');
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          bullets: updatedBullets
        };
        return {
          ...sec,
          items: updatedItems
        };
      })
    }));
  };

  const removeCustomSectionBullet = (sectionId, itemIdx, bulletIdx) => {
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const updatedItems = [...sec.items];
        const updatedBullets = updatedItems[itemIdx].bullets.filter((_, i) => i !== bulletIdx);
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          bullets: updatedBullets
        };
        return {
          ...sec,
          items: updatedItems
        };
      })
    }));
  };

  // Export handlers
  const downloadDocx = async () => {
    if (!cvData) return;
    try {
      setIsLoading(true);
      const blob = await generateDocx(cvData);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cvData.name || 'Formatted'}_CV.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate DOCX file: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!cvData) return;
    try {
      setIsLoading(true);
      const element = document.querySelector('.cv-page');
      if (!element) {
        throw new Error('Preview element not found');
      }

      // Generate canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high resolution
        useCORS: true,
        logging: false,
        windowWidth: 1200, // Force desktop width to disable responsive collapsing in PDF
        onclone: (clonedDoc) => {
          const cvPage = clonedDoc.querySelector('.cv-page');
          if (cvPage) {
            cvPage.style.boxShadow = 'none';
            cvPage.style.border = 'none';
            cvPage.style.margin = '0';
          }
          const dividers = clonedDoc.querySelectorAll('.cv-page-divider');
          dividers.forEach(div => div.style.display = 'none');
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // A4 dimensions: 210mm x 297mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page content slicing
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${cvData.name || 'Formatted'}_CV.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleReset = () => {
    setCvData(null);
    setRawText('');
    setError('');
    setActiveTab('personal');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <FileText className="brand-icon" size={28} color="#c2410c" />
          <h1>Premium CV Formatter</h1>
        </div>
        <div className="api-key-container">
          <Key size={16} color="#94a3b8" />
          <input 
            type="password" 
            placeholder="Gemini API Key (optional)" 
            value={apiKey} 
            onChange={handleApiKeyChange}
            className="api-key-input"
            title="Enter Gemini API key to use advanced AI extraction"
          />
          <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isAIEnabled} 
              onChange={() => setIsAIEnabled(!isAIEnabled)}
              disabled={!apiKey}
              style={{ cursor: 'pointer' }}
            />
            Use AI
          </label>
        </div>
      </header>

      {/* 1. INITIAL UPLOAD STATE */}
      {!cvData && (
        <main className="upload-workspace">
          <h2 style={{ fontFamily: 'Raleway', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-light)' }}>
            Transform Your CV Layout
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Upload a DOCX or PDF resume to extract its details and format them into the Gadi Manor premium structure.
          </p>

          {isLoading ? (
            <div style={{ padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--accent-blue)', marginTop: '1rem', fontWeight: 600 }}>
                {isAIEnabled && apiKey ? 'AI-powered parser extracting contents...' : 'Parsing CV contents client-side...'}
              </p>
            </div>
          ) : (
            <>
              <div 
                className={`dropzone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerUploadClick}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".docx,.pdf"
                  style={{ display: 'none' }}
                />
                <UploadCloud size={48} className="dropzone-icon" />
                <p style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                  Drag and drop your file here, or <span style={{ color: 'var(--accent-blue)' }}>browse</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports DOCX and PDF (standard readable text)
                </p>
              </div>
              <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCvData(sampleCVData);
                  }}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Sparkles size={14} color="#c2410c" /> Try with Sample CV Data
                </button>
              </div>
            </>
          )}

          {error && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span style={{ textAlign: 'left' }}>{error}</span>
            </div>
          )}

          <div style={{ marginTop: '2.5rem', textAlign: 'left', width: '100%', background: 'rgba(194, 65, 12, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(194, 65, 12, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>
              <Sparkles size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, uppercase: 'true' }}>Pro Tip</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Adding a Gemini API Key in the top right enables deep layout understanding. It will extract complex bullet points, separate company names from roles, and map skills accurately. (API key is stored locally in your browser).
            </p>
          </div>
        </main>
      )}

      {/* 2. DUAL EDITOR / PREVIEW WORKSPACE */}
      {cvData && (
        <main className="workspace">
          {/* Left panel: Form Editor */}
          <section className="editor-panel">
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <Cpu size={16} /> Contact
              </button>
              <button 
                className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                <Info size={16} /> Summary
              </button>
              <button 
                className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`}
                onClick={() => setActiveTab('experience')}
              >
                <Briefcase size={16} /> Work
              </button>
              <button 
                className={`tab-btn ${activeTab === 'education' ? 'active' : ''}`}
                onClick={() => setActiveTab('education')}
              >
                <GraduationCap size={16} /> School
              </button>
              <button 
                className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                onClick={() => setActiveTab('skills')}
              >
                <Wrench size={16} /> Skills
              </button>
              <button 
                className={`tab-btn ${activeTab === 'languages' ? 'active' : ''}`}
                onClick={() => setActiveTab('languages')}
              >
                <Globe size={16} /> Languages
              </button>
              {(cvData.customSections || []).map(section => (
                <button
                  key={section.id}
                  className={`tab-btn ${activeTab === section.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(section.id)}
                >
                  <Sparkles size={16} color="#c2410c" /> {section.title || 'Section'}
                </button>
              ))}
              <button 
                type="button"
                className="tab-btn add-sec-btn"
                style={{ 
                  color: 'var(--accent-orange)', 
                  border: '1px dashed rgba(194, 65, 12, 0.4)', 
                  background: 'rgba(194, 65, 12, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600
                }}
                onClick={handleAddCustomSection}
              >
                <Plus size={14} /> Add Section
              </button>
            </div>

            {/* TAB CONTENT: PERSONAL */}
            {activeTab === 'personal' && (
              <div className="editor-card">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={cvData.name} 
                    onChange={(e) => handleFieldChange('personal', null, 'name', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Title / Specialization</label>
                  <input 
                    type="text" 
                    value={cvData.title} 
                    onChange={(e) => handleFieldChange('personal', null, 'title', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Senior Backend Engineer (Node.js)"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={cvData.email} 
                      onChange={(e) => handleFieldChange('personal', null, 'email', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      value={cvData.phone} 
                      onChange={(e) => handleFieldChange('personal', null, 'phone', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input 
                    type="text" 
                    value={cvData.location} 
                    onChange={(e) => handleFieldChange('personal', null, 'location', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Herzliya, Israel"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>LinkedIn Link</label>
                    <input 
                      type="text" 
                      value={cvData.linkedin} 
                      onChange={(e) => handleFieldChange('personal', null, 'linkedin', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub Link</label>
                    <input 
                      type="text" 
                      value={cvData.github} 
                      onChange={(e) => handleFieldChange('personal', null, 'github', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SUMMARY */}
            {activeTab === 'summary' && (
              <div className="editor-card">
                <div className="form-group">
                  <label>Professional Summary</label>
                  <textarea 
                    rows={6}
                    value={cvData.summary} 
                    onChange={(e) => handleFieldChange('summary', null, 'summary', e.target.value)}
                    className="form-textarea"
                    placeholder="Write a brief, punchy professional summary..."
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: EXPERIENCE */}
            {activeTab === 'experience' && (
              <div className="editor-card">
                {cvData.experience.map((job, jobIdx) => (
                  <div key={jobIdx} className="repeater-item">
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeRepeatedItem('experience', jobIdx)}
                    >
                      <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Delete Job
                    </button>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Company / Organization</label>
                        <input 
                          type="text" 
                          value={job.organization} 
                          onChange={(e) => handleFieldChange('experience', jobIdx, 'organization', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates (e.g. 2019 – Present)</label>
                        <input 
                          type="text" 
                          value={job.dates} 
                          onChange={(e) => handleFieldChange('experience', jobIdx, 'dates', e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Job Title / Role</label>
                      <input 
                        type="text" 
                        value={job.role} 
                        onChange={(e) => handleFieldChange('experience', jobIdx, 'role', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Bullet Responsibilities</span>
                        <button 
                          type="button" 
                          className="add-btn" 
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                          onClick={() => addBullet(jobIdx)}
                        >
                          <Plus size={10} /> Add Bullet
                        </button>
                      </label>
                      
                      {job.bullets.map((bullet, bulletIdx) => (
                        <div key={bulletIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <input 
                            type="text" 
                            value={bullet} 
                            onChange={(e) => handleBulletChange(jobIdx, bulletIdx, e.target.value)}
                            className="form-input"
                            style={{ flex: 1 }}
                          />
                          <button 
                            type="button" 
                            onClick={() => removeBullet(jobIdx, bulletIdx)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  className="add-btn"
                  onClick={() => addRepeatedItem('experience')}
                >
                  <Plus size={16} /> Add Work Experience
                </button>
              </div>
            )}

            {/* TAB CONTENT: EDUCATION */}
            {activeTab === 'education' && (
              <div className="editor-card">
                {cvData.education.map((edu, eduIdx) => (
                  <div key={eduIdx} className="repeater-item">
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeRepeatedItem('education', eduIdx)}
                    >
                      <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Remove
                    </button>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Degree / Field of Study</label>
                        <input 
                          type="text" 
                          value={edu.role} 
                          onChange={(e) => handleFieldChange('education', eduIdx, 'role', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates (e.g. 2010 – 2013)</label>
                        <input 
                          type="text" 
                          value={edu.dates} 
                          onChange={(e) => handleFieldChange('education', eduIdx, 'dates', e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>School / Institution</label>
                      <input 
                        type="text" 
                        value={edu.organization} 
                        onChange={(e) => handleFieldChange('education', eduIdx, 'organization', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  className="add-btn"
                  onClick={() => addRepeatedItem('education')}
                >
                  <Plus size={16} /> Add Education
                </button>
              </div>
            )}

            {/* TAB CONTENT: SKILLS */}
            {activeTab === 'skills' && (
              <div className="editor-card">
                {cvData.skills.map((skill, skillIdx) => (
                  <div key={skillIdx} className="repeater-item">
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeRepeatedItem('skills', skillIdx)}
                    >
                      <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Remove
                    </button>

                    <div className="form-group">
                      <label>Category Title</label>
                      <input 
                        type="text" 
                        value={skill.category} 
                        onChange={(e) => handleFieldChange('skills', skillIdx, 'category', e.target.value)}
                        className="form-input"
                        placeholder="e.g. Languages & Frameworks"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Skills List (comma-separated)</label>
                      <input 
                        type="text" 
                        value={skill.items} 
                        onChange={(e) => handleFieldChange('skills', skillIdx, 'items', e.target.value)}
                        className="form-input"
                        placeholder="e.g. Node.js, TypeScript, Python"
                      />
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  className="add-btn"
                  onClick={() => addRepeatedItem('skills')}
                >
                  <Plus size={16} /> Add Skills Category
                </button>
              </div>
            )}

            {/* TAB CONTENT: CUSTOM DYNAMIC SECTIONS */}
            {activeTab.startsWith('custom_') && (
              <div className="editor-card">
                {(() => {
                  const section = (cvData.customSections || []).find(sec => sec.id === activeTab);
                  if (!section) return null;
                  return (
                    <div>
                      <div className="form-group" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label>Section Title</label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleCustomSectionTitleChange(section.id, e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSection(section.id)}
                          className="btn-secondary"
                          style={{ borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', background: 'rgba(239,68,68,0.05)', padding: '0.65rem 1.2rem', height: 'fit-content' }}
                        >
                          <Trash2 size={14} style={{ marginRight: '0.2rem' }} /> Delete Section
                        </button>
                      </div>

                      {(section.items || []).map((item, itemIdx) => (
                        <div key={itemIdx} className="repeater-item">
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeCustomSectionItem(section.id, itemIdx)}
                          >
                            <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Remove Item
                          </button>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Item Title / Heading</label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleCustomSectionItemChange(section.id, itemIdx, 'title', e.target.value)}
                                className="form-input"
                                placeholder="e.g. AWS Solutions Architect or Project Delta"
                              />
                            </div>
                            <div className="form-group">
                              <label>Dates (e.g. 2023)</label>
                              <input
                                type="text"
                                value={item.date}
                                onChange={(e) => handleCustomSectionItemChange(section.id, itemIdx, 'date', e.target.value)}
                                className="form-input"
                                placeholder="e.g. 2023"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Subtitle / Organization</label>
                            <input
                              type="text"
                              value={item.subtitle}
                              onChange={(e) => handleCustomSectionItemChange(section.id, itemIdx, 'subtitle', e.target.value)}
                              className="form-input"
                              placeholder="e.g. Amazon Web Services or React, Node.js"
                            />
                          </div>

                          <div className="form-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Bullet Details</span>
                              <button
                                type="button"
                                className="add-btn"
                                style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={() => addCustomSectionBullet(section.id, itemIdx)}
                              >
                                <Plus size={10} /> Add Bullet
                              </button>
                            </label>

                            {(item.bullets || []).map((bullet, bulletIdx) => (
                              <div key={bulletIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <input
                                  type="text"
                                  value={bullet}
                                  onChange={(e) => handleCustomSectionBulletChange(section.id, itemIdx, bulletIdx, e.target.value)}
                                  className="form-input"
                                  style={{ flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeCustomSectionBullet(section.id, itemIdx, bulletIdx)}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => addCustomSectionItem(section.id)}
                      >
                        <Plus size={16} /> Add Item
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB CONTENT: LANGUAGES */}
            {activeTab === 'languages' && (
              <div className="editor-card">
                {(cvData.languages || []).map((lang, langIdx) => (
                  <div key={langIdx} className="repeater-item">
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeRepeatedItem('languages', langIdx)}
                    >
                      <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Remove
                    </button>

                    <div className="form-group">
                      <label>Language</label>
                      <input 
                        type="text" 
                        value={lang.name} 
                        onChange={(e) => handleFieldChange('languages', langIdx, 'name', e.target.value)}
                        className="form-input"
                        placeholder="e.g. Hebrew"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Proficiency / Level</label>
                      <input 
                        type="text" 
                        value={lang.proficiency} 
                        onChange={(e) => handleFieldChange('languages', langIdx, 'proficiency', e.target.value)}
                        className="form-input"
                        placeholder="e.g. Native, Fluent, Intermediate"
                      />
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  className="add-btn"
                  onClick={() => addRepeatedItem('languages')}
                >
                  <Plus size={16} /> Add Language
                </button>
              </div>
            )}

            {/* Bottom Editor Toolbar */}
            <div className="toolbar">
              <button onClick={handleReset} className="btn-secondary">
                <RefreshCw size={16} /> Start Over
              </button>
              <button onClick={downloadPdf} className="btn-primary" disabled={isLoading}>
                <FileDown size={16} /> Download PDF
              </button>
              <button onClick={downloadDocx} className="btn-primary" disabled={isLoading}>
                <FileDown size={16} /> Download DOCX
              </button>
            </div>
          </section>

          {/* Right panel: A4 CV Preview */}
          <section className="preview-panel">
            <div className="cv-preview-container">
              <div 
                className="cv-page" 
                ref={cvPageRef} 
                style={{ '--cv-page-height': `${pageCount * 297}mm` }}
              >
                {/* Visual Page Break Dividers (Preview Only) */}
                {Array.from({ length: pageCount - 1 }).map((_, idx) => (
                  <div 
                    key={idx} 
                    className="cv-page-divider" 
                    style={{ top: `${(idx + 1) * 297}mm` }}
                  >
                    <span>PAGE {idx + 1} BREAK</span>
                  </div>
                ))}
                {/* CV Header */}
                <div className="cv-header">
                  <div className="cv-name-row">
                    <span className="cv-name">{cvData.name || 'Your Name'}</span>
                    {(cvData.name && cvData.title) && <span className="cv-name-separator"></span>}
                    <span className="cv-title">{cvData.title || 'Specialization'}</span>
                  </div>
                  
                  <div className="cv-subtitle-row">
                    {cvData.phone && (
                      <div className="cv-subtitle-item">
                        <Phone size={11} />
                        <span>{cvData.phone}</span>
                      </div>
                    )}
                    {(cvData.phone && cvData.email) && <span className="cv-subtitle-bullet">•</span>}
                    {cvData.email && (
                      <div className="cv-subtitle-item">
                        <Mail size={11} />
                        <span>{cvData.email}</span>
                      </div>
                    )}
                    {(cvData.email && cvData.location) && <span className="cv-subtitle-bullet">•</span>}
                    {cvData.location && (
                      <div className="cv-subtitle-item">
                        <MapPin size={11} />
                        <span>{cvData.location}</span>
                      </div>
                    )}
                    {(cvData.location && cvData.linkedin) && <span className="cv-subtitle-bullet">•</span>}
                    {cvData.linkedin && (
                      <div className="cv-subtitle-item">
                        <Linkedin size={11} />
                        <a 
                          href={cvData.linkedin.trim().startsWith('http') ? cvData.linkedin.trim() : `https://${cvData.linkedin.trim()}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          Linkedin
                        </a>
                      </div>
                    )}
                    {(cvData.linkedin && cvData.github) && <span className="cv-subtitle-bullet">•</span>}
                    {cvData.github && (
                      <div className="cv-subtitle-item">
                        <Github size={11} />
                        <a 
                          href={cvData.github.trim().startsWith('http') ? cvData.github.trim() : `https://${cvData.github.trim()}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          Github
                        </a>
                      </div>
                    )}
                  </div>

                  {cvData.summary && (
                    <div className="cv-summary">
                      {cvData.summary}
                    </div>
                  )}
                </div>

                {/* Experience Section */}
                {cvData.experience && cvData.experience.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-header">
                      <h3 className="cv-section-title">Experience</h3>
                      <div className="cv-divider"></div>
                    </div>
                    {cvData.experience.map((job, jobIdx) => {
                      if (!job.organization && !job.role) return null;
                      return (
                        <div key={jobIdx} className="cv-item">
                          <div className="cv-item-header">
                            <div className="cv-item-title-org">
                              <span className="cv-org">{job.organization || 'Company'}</span>
                              <span className="cv-role-separator">/</span>
                              <span className="cv-role">{job.role || 'Role'}</span>
                            </div>
                            <span className="cv-date">{job.dates || 'Dates'}</span>
                          </div>
                          {job.bullets && job.bullets.length > 0 && (
                            <ul className="cv-bullets">
                              {job.bullets.map((bullet, bulletIdx) => (
                                bullet.trim() && <li key={bulletIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Education Section */}
                {cvData.education && cvData.education.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-header">
                      <h3 className="cv-section-title">Education</h3>
                      <div className="cv-divider"></div>
                    </div>
                    {cvData.education.map((edu, eduIdx) => {
                      if (!edu.organization && !edu.role) return null;
                      return (
                        <div key={eduIdx} className="cv-item">
                          <div className="cv-item-header">
                            <div className="cv-item-title-org">
                              <span className="cv-role" style={{ fontWeight: 700 }}>{edu.role || 'Degree'}</span>
                              <span className="cv-role-separator">/</span>
                              <span className="cv-org">{edu.organization || 'Institution'}</span>
                            </div>
                            <span className="cv-date">{edu.dates || 'Dates'}</span>
                          </div>
                          {edu.bullets && edu.bullets.length > 0 && (
                            <ul className="cv-bullets">
                              {edu.bullets.map((bullet, bulletIdx) => (
                                bullet.trim() && <li key={bulletIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tech Skills Section */}
                {cvData.skills && cvData.skills.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-header">
                      <h3 className="cv-section-title">Tech Skills</h3>
                      <div className="cv-divider"></div>
                    </div>
                    <div className="cv-skills-grid">
                      {cvData.skills.map((skill, skillIdx) => {
                        if (!skill.category || !skill.items) return null;
                        return (
                          <div key={skillIdx} className="cv-skills-item">
                            <span className="cv-skills-category">{skill.category}: </span>
                            <span className="cv-skills-list">{skill.items}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Sections Section */}
                {cvData.customSections && cvData.customSections.length > 0 && (
                  <>
                    {cvData.customSections.map((section) => {
                      if (!section.title || !section.title.trim()) return null;
                      const activeItems = (section.items || []).filter(item => item.title && item.title.trim());
                      if (activeItems.length === 0) return null;
                      return (
                        <div key={section.id} className="cv-section">
                          <div className="cv-section-header">
                            <h3 className="cv-section-title">{section.title}</h3>
                            <div className="cv-divider"></div>
                          </div>
                          {activeItems.map((item, itemIdx) => (
                            <div key={itemIdx} className="cv-item">
                              <div className="cv-item-header">
                                <div className="cv-item-title-org">
                                  <span className="cv-org">{item.title}</span>
                                  {item.subtitle && <span className="cv-role-separator">/</span>}
                                  {item.subtitle && <span className="cv-role">{item.subtitle}</span>}
                                </div>
                                <span className="cv-date">{item.date}</span>
                              </div>
                              {item.bullets && item.bullets.length > 0 && (
                                <ul className="cv-bullets">
                                  {item.bullets.map((bullet, bulletIdx) => (
                                    bullet.trim() && <li key={bulletIdx}>{bullet}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Languages Section */}
                {cvData.languages && cvData.languages.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-header">
                      <h3 className="cv-section-title">Languages</h3>
                      <div className="cv-divider"></div>
                    </div>
                    <div className="cv-languages-grid">
                      {cvData.languages.map((lang, langIdx) => {
                        if (!lang.name) return null;
                        return (
                          <div key={langIdx} className="cv-language-item">
                            <span className="cv-language-name">{lang.name}</span>
                            {lang.proficiency && <span>: {lang.proficiency}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Custom Add Section Modal */}
      {isAddSectionModalOpen && (
        <div className="custom-modal-overlay" onClick={() => setIsAddSectionModalOpen(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <Sparkles size={18} color="#c2410c" />
              <h3>Add Custom Section</h3>
            </div>
            <form onSubmit={handleConfirmAddSection}>
              <div className="custom-modal-body">
                <p>Enter the name for your new CV section (e.g. Certifications, Projects, Volunteering):</p>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="e.g. Certifications"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div className="custom-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-confirm"
                  disabled={!newSectionTitle.trim()}
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="custom-modal-overlay" onClick={() => {
          setIsDeleteModalOpen(false);
          setSectionIdToDelete(null);
        }}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <Trash2 size={18} color="#ef4444" />
              <h3 style={{ color: '#ef4444' }}>Delete Custom Section</h3>
            </div>
            <div className="custom-modal-body">
              <p>Are you sure you want to delete this custom section? This action will permanently remove all items inside it.</p>
            </div>
            <div className="custom-modal-footer">
              <button 
                type="button" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSectionIdToDelete(null);
                }}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDeleteSection}
                className="btn-modal-confirm"
                style={{ background: '#ef4444' }}
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
