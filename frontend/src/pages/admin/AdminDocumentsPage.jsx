import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import {
  getTransactionTypes,
  createTransactionType,
  updateTransactionType,
  deleteTransactionType
} from '../../services/adminService';
import {
  FileText, Plus, Edit2, Trash2, X, Check, Search, Save, AlertCircle, Settings, Eye, Loader2
} from 'lucide-react';

export default function AdminDocumentsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requires_semester: false,
    requires_year_level: false,
    requires_school_year: false,
    requires_purpose: false,
    required_documents: [],
    processing_steps: []
  });
  const [docInput, setDocInput] = useState('');
  const [stepInput, setStepInput] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactionTypes(token);
      
      // Parse the configuration from description
      const parsedData = data.map(t => {
        const parts = (t.description || '').split('|||');
        const descText = parts[0];
        let config = {};
        if (parts.length > 1) {
          try { config = JSON.parse(parts[1]); } catch (e) {}
        }
        return {
          ...t,
          clean_description: descText,
          config
        };
      });
      setTransactions(parsedData.filter(t => t.is_active !== false));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tx = null, mode = 'edit') => {
    setIsViewMode(mode === 'view');
    if (tx) {
      setEditingId(tx.id);
      setFormData({
        name: tx.name,
        description: tx.clean_description,
        requires_semester: tx.config?.requires_semester || false,
        requires_year_level: tx.config?.requires_year_level || false,
        requires_school_year: tx.config?.requires_school_year || false,
        requires_purpose: tx.config?.requires_purpose || false,
        required_documents: tx.config?.required_documents || tx.required_documents || [],
        processing_steps: tx.config?.processing_steps || tx.processing_steps || []
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        requires_semester: false,
        requires_year_level: false,
        requires_school_year: false,
        requires_purpose: false,
        required_documents: [],
        processing_steps: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    if (editingId) {
      const tx = transactions.find(t => t.id === editingId);
      if (tx) {
        setFormData({
          name: tx.name,
          description: tx.clean_description,
          requires_semester: tx.config?.requires_semester || false,
          requires_year_level: tx.config?.requires_year_level || false,
          requires_school_year: tx.config?.requires_school_year || false,
          requires_purpose: tx.config?.requires_purpose || false,
          required_documents: tx.config?.required_documents || tx.required_documents || [],
          processing_steps: tx.config?.processing_steps || tx.processing_steps || []
        });
      }
      setIsViewMode(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return alert('Name is required');
    setIsSaving(true);
    try {
      if (editingId) {
        await updateTransactionType(token, editingId, formData);
      } else {
        await createTransactionType(token, formData);
      }
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteTransactionType(token, deletingId);
      setDeleteModalOpen(false);
      setDeletingId(null);
      fetchTransactions();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.clean_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="max-w-6xl mx-auto h-full overflow-y-auto pb-10 pr-2 custom-scrollbar">
        <div className="mb-8">
          <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">SYSTEM CONFIGURATION</div>
          <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
            <FileText className="text-maroon" size={24} />
            Documents & Transactions
          </h1>
          <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
            Configure available document requests, requirements, and processing steps.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-87.5">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search document types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.75 bg-white border border-border rounded-xl focus:outline-none focus:border-maroon/50 focus:ring-2 focus:ring-maroon/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all font-sans text-[14px]"
            />
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto py-2.75 px-7 rounded-xl bg-maroon text-white text-[14px] font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_rgba(123,26,42,0.25)] hover:shadow-[0_12px_25px_rgba(123,26,42,0.35)] hover:-translate-y-0.5 hover:bg-[#8B1E32] transition-all duration-300 border-none"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded-md w-full"></div>
                  <div className="h-3 bg-gray-100 rounded-md w-5/6"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
                  <div className="h-6 w-20 bg-gray-100 rounded-md"></div>
                </div>
                <div className="mt-auto pt-4 flex gap-2 justify-end">
                  <div className="h-9 w-9 bg-gray-100 rounded-xl"></div>
                  <div className="h-9 w-9 bg-gray-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 bg-maroon/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-maroon/40" size={32} />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-1">No documents found</h3>
            <p className="text-text-sub text-sm">Add a new document type to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTransactions.map((tx, idx) => (
              <div key={tx.id} className="bg-white p-6 rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 group animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="mb-3 flex items-start justify-between gap-4">
                  <h3 className="font-bold text-text-main m-0 text-[18px] leading-tight group-hover:text-maroon transition-colors">{tx.name}</h3>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleOpenModal(tx, 'edit')} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-border/50 text-text-muted hover:text-maroon hover:border-maroon/30 hover:bg-maroon/5 cursor-pointer transition-all shadow-sm">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteClick(tx.id)} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-border/50 text-text-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5 cursor-pointer transition-all shadow-sm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-text-sub text-[13px] m-0 mb-5 line-clamp-2 leading-relaxed">{tx.clean_description}</p>
                
                {(tx.config?.requires_semester || tx.config?.requires_year_level || tx.config?.requires_school_year || tx.config?.requires_purpose) && (
                  <div className="mb-5">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Required Information</span>
                    <div className="flex flex-wrap gap-2">
                      {tx.config?.requires_semester && <span className="px-2.5 py-1 bg-[#EEF2FF] text-[#4338CA] rounded-md text-[11px] font-bold tracking-wide uppercase border border-[#C7D2FE]">Semester</span>}
                      {tx.config?.requires_year_level && <span className="px-2.5 py-1 bg-[#FAF5FF] text-[#7E22CE] rounded-md text-[11px] font-bold tracking-wide uppercase border border-[#E9D5FF]">Year Level</span>}
                      {tx.config?.requires_school_year && <span className="px-2.5 py-1 bg-[#FFFBEB] text-[#B45309] rounded-md text-[11px] font-bold tracking-wide uppercase border border-[#FDE68A]">School Year</span>}
                      {tx.config?.requires_purpose && <span className="px-2.5 py-1 bg-success-light text-success rounded-md text-[11px] font-bold tracking-wide uppercase border border-success-border">Purpose</span>}
                    </div>
                  </div>
                )}

                {((tx.config?.required_documents || tx.required_documents || []).length > 0 || (tx.config?.processing_steps || tx.processing_steps || []).length > 0) && (
                  <div className="flex flex-col gap-4 mb-2 p-4 bg-off-white/50 rounded-xl border border-border/50 mt-auto">
                    {((tx.config?.required_documents || tx.required_documents || []).length > 0) && (
                      <div>
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Requirements</span>
                        <ul className="m-0 p-0 pl-4 list-disc text-[13px] text-text-sub space-y-1">
                          {(tx.config?.required_documents || tx.required_documents).map((doc, i) => (
                            <li key={i} className="pl-1 marker:text-maroon/40">{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((tx.config?.processing_steps || tx.processing_steps || []).length > 0) && (
                      <div>
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Processing Steps</span>
                        <div className="flex flex-col gap-2">
                          {(tx.config?.processing_steps || tx.processing_steps).map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-[13px] text-text-sub">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-maroon/10 text-maroon flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                              <span className="leading-tight">{step.name} {step.requires_presence && <span className="text-[10px] text-gold font-bold ml-1">(Requires Presence)</span>}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/View Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up border border-border">
            <div className="flex items-center justify-between p-5 px-6 border-b border-border bg-off-white">
              <h2 className="m-0 text-[18px] font-bold font-serif text-text-main flex items-center gap-2">
                {isViewMode ? <Eye size={18} className="text-maroon"/> : editingId ? <Edit2 size={18} className="text-maroon"/> : <Plus size={18} className="text-maroon"/>}
                {isViewMode ? 'Document Details' : editingId ? 'Edit Document Type' : 'Add Document Type'}
              </h2>
              <div className="flex items-center gap-2">
                {isViewMode && (
                  <button onClick={() => setIsViewMode(false)} className="bg-white border border-border text-text-main hover:text-maroon hover:border-maroon rounded-lg px-3 py-1.5 text-[12px] font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5">
                    <Edit2 size={12} /> Edit
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="bg-white border border-border text-text-muted hover:text-danger hover:border-danger rounded-lg p-1.5 cursor-pointer transition-colors shadow-sm flex items-center justify-center">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            <div className="p-6 px-7 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-text-main mb-1.5">Document Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    disabled={isViewMode}
                    placeholder="e.g. Certificate of Enrollment"
                    className={`w-full px-4 py-2.75 bg-white border border-border rounded-xl focus:outline-none focus:border-maroon focus:shadow-[0_0_0_3px_rgba(123,26,42,0.1)] transition-all font-sans text-[14px] ${isViewMode ? 'opacity-80 bg-off-white' : ''}`}
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-text-main mb-1.5">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    disabled={isViewMode}
                    placeholder="Describe what this document is for..."
                    rows={3}
                    className={`w-full px-4 py-2.75 bg-white border border-border rounded-xl focus:outline-none focus:border-maroon focus:shadow-[0_0_0_3px_rgba(123,26,42,0.1)] transition-all font-sans text-[14px] resize-none ${isViewMode ? 'opacity-80 bg-off-white' : ''}`}
                  />
                </div>

                {(!isViewMode || [
                  'requires_semester', 'requires_year_level', 'requires_school_year', 'requires_purpose'
                ].some(id => formData[id])) && (
                  <div className="bg-off-white p-5 rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                    <label className="text-[13px] font-bold text-text-main mb-3 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-maroon"/>
                      Required Student Information
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'requires_semester', label: 'Semester' },
                        { id: 'requires_year_level', label: 'Year Level' },
                        { id: 'requires_school_year', label: 'School Year' },
                        { id: 'requires_purpose', label: 'Purpose of Request' }
                      ].filter(field => !isViewMode || formData[field.id]).map(field => (
                        <label key={field.id} className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-200 border ${formData[field.id] ? 'bg-maroon-light border-maroon/20' : 'bg-white border-border hover:border-maroon/30'} ${isViewMode ? 'opacity-80' : 'cursor-pointer'}`}>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-200 ${formData[field.id] ? 'bg-maroon border-maroon text-white shadow-[0_2px_4px_rgba(123,26,42,0.2)]' : 'bg-off-white border-border text-transparent'}`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <span className="text-sm font-medium text-text-main select-none">{field.label}</span>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={formData[field.id]}
                            disabled={isViewMode}
                            onChange={e => setFormData({...formData, [field.id]: e.target.checked})}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(!isViewMode || formData.required_documents.length > 0) && (
                  <div>
                    <label className="block text-[13px] font-bold text-text-main mb-1.5">Required Documents to Submit</label>
                    {!isViewMode && (
                      <div className="flex gap-2 mb-3">
                        <input 
                          type="text"
                          value={docInput}
                          onChange={e => setDocInput(e.target.value)}
                          placeholder="e.g. Student ID, Clearance..."
                          className="flex-1 px-4 py-2.25 bg-white border border-border rounded-xl focus:outline-none focus:border-maroon focus:shadow-[0_0_0_3px_rgba(123,26,42,0.1)] transition-all font-sans text-[13px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (docInput.trim()) {
                                setFormData({...formData, required_documents: [...formData.required_documents, docInput.trim()]});
                                setDocInput('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (docInput.trim()) {
                              setFormData({...formData, required_documents: [...formData.required_documents, docInput.trim()]});
                              setDocInput('');
                            }
                          }}
                          className="bg-white border border-border text-text-main hover:bg-off-white px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {formData.required_documents.length > 0 && (
                      <ul className="m-0 p-0 list-none space-y-1.5">
                        {formData.required_documents.map((doc, idx) => (
                          <li key={idx} className={`flex items-center justify-between bg-off-white px-3 py-2 rounded-lg text-sm border border-border ${isViewMode ? 'opacity-80' : ''}`}>
                            <span>{doc}</span>
                            {!isViewMode && (
                              <button onClick={() => setFormData({...formData, required_documents: formData.required_documents.filter((_, i) => i !== idx)})} className="bg-transparent border-none text-text-muted hover:text-danger cursor-pointer p-0 flex">
                                <X size={14}/>
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {(!isViewMode || formData.processing_steps.length > 0) && (
                  <div>
                    <label className="block text-[13px] font-bold text-text-main mb-1.5">Processing Steps</label>
                    {!isViewMode && (
                      <div className="flex gap-2 mb-3">
                        <input 
                          type="text"
                          value={stepInput}
                          onChange={e => setStepInput(e.target.value)}
                          placeholder="e.g. Verification, Printing..."
                          className="flex-1 px-4 py-2.25 bg-white border border-border rounded-xl focus:outline-none focus:border-maroon focus:shadow-[0_0_0_3px_rgba(123,26,42,0.1)] transition-all font-sans text-[13px]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (stepInput.trim()) {
                                setFormData({...formData, processing_steps: [...formData.processing_steps, { name: stepInput.trim(), requires_presence: false }]});
                                setStepInput('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (stepInput.trim()) {
                              setFormData({...formData, processing_steps: [...formData.processing_steps, { name: stepInput.trim(), requires_presence: false }]});
                              setStepInput('');
                            }
                          }}
                          className="bg-white border border-border text-text-main hover:bg-off-white px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {formData.processing_steps.length > 0 && (
                      <ul className="m-0 p-0 list-none space-y-1.5">
                        {formData.processing_steps.map((step, i) => (
                          <li key={i} className="flex flex-col gap-2 bg-off-white px-3 py-2.5 rounded-lg text-sm border border-border">
                            <div className="flex items-start justify-between">
                              <span className="font-semibold">{i + 1}. {step.name}</span>
                              {!isViewMode && (
                                <button onClick={() => setFormData({...formData, processing_steps: formData.processing_steps.filter((_, idx) => idx !== i)})} className="bg-transparent border-none text-text-muted hover:text-danger cursor-pointer p-0 flex">
                                  <X size={14}/>
                                </button>
                              )}
                            </div>
                            {(!isViewMode || step.requires_presence) && (
                              <label className={`flex items-center gap-1.5 ${isViewMode ? 'opacity-80 cursor-default' : 'cursor-pointer'} self-start select-none`}>
                                <input 
                                  type="checkbox" 
                                  checked={step.requires_presence}
                                  disabled={isViewMode}
                                  onChange={e => {
                                    const newSteps = [...formData.processing_steps];
                                    newSteps[i].requires_presence = e.target.checked;
                                    setFormData({...formData, processing_steps: newSteps});
                                  }}
                                  className="accent-maroon cursor-pointer"
                                />
                                <span className="text-xs text-text-sub">Requires student presence</span>
                              </label>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
              </div>
            </div>

            {!isViewMode && (
              <div className="p-5 border-t border-border bg-off-white flex justify-end gap-3">
                <button 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-white border border-border text-text-main hover:bg-gray-50 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-maroon hover:bg-maroon-dark text-white border-none rounded-xl font-medium flex items-center gap-2 cursor-pointer shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Document')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] w-full max-w-sm overflow-hidden animate-scale-up border border-border">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-text-main m-0 mb-2">Delete Document Type?</h3>
              <p className="text-text-sub text-[14px] m-0 mb-6">
                This action cannot be undone. Are you sure you want to permanently delete this document type?
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-white border border-border text-text-main hover:bg-off-white rounded-xl font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-danger hover:bg-[#b91c1c] text-white border-none rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
