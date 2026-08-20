import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import StudentLayout from '../../components/layout/StudentLayout'
import { getMyAppointments, cancelAppointment, clearCancelledAppointments } from '../../services/appointmentService'
import RescheduleModal from '../../components/RescheduleModal'
import { 
  Inbox, Calendar, Tag, FileText, AlertTriangle, ChevronLeft, ChevronRight, 
  Clock, CheckCircle, CheckCircle2, Filter, ChevronDown, Trash2, FileCheck, MapPin, 
  Building2, ShieldCheck, ArrowRight, PlusCircle, Sparkles, Zap, Info, X, 
  CalendarCheck, FolderOpen, ClipboardList, ExternalLink, RefreshCw 
} from 'lucide-react'

const CustomDropdown = ({ value, onChange, options, icon }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="relative inline-block w-auto min-w-36.25 sm:min-w-45 max-w-50 sm:max-w-55 z-20 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-2.5 pl-8 sm:py-2.5 sm:pl-9 sm:pr-3 rounded-xl border border-border sm:border-[1.5px] bg-white text-xs sm:text-[13.5px] text-text-main font-bold outline-none cursor-pointer font-sans hover:border-maroon/30 transition-all shadow-2xs"
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none text-gold">
          {React.isValidElement(icon) ? React.cloneElement(icon, { size: 14, className: "sm:w-4 sm:h-4 text-gold shrink-0" }) : icon}
        </div>
        <span className="truncate pr-1.5 text-left">{currentLabel}</span>
        <ChevronDown size={14} className={`text-text-sub transition-transform duration-200 shrink-0 sm:w-4 sm:h-4 ${isOpen ? 'rotate-180' : 'group-hover:text-text-main'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 min-w-full w-max max-w-65 bg-white rounded-xl border border-border shadow-lg p-1.5 z-50 animate-fade-up max-h-75 overflow-y-auto" style={{ animationDuration: '0.2s' }}>
            {options.map(o => {
              const isActive = value === o.value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon' : 'text-text-main hover:bg-off-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold whitespace-nowrap">{o.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const STATUS = {
  scheduled_release: { label: 'Scheduled for Release', bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  ready_for_pickup: { label: 'Ready for Pickup', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  confirmed: { label: 'Confirmed', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  pending: { label: 'Pending', bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A' },
  cancelled: { label: 'Cancelled', bg: '#F9F0F1', color: '#7B1A2A', border: '#FECACA' },
  completed: { label: 'Completed', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  no_show: { label: 'No Show', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
}

export const isAppointmentToday = (dateStr) => {
  if (!dateStr) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const localToday = `${y}-${m}-${d}`;
  return dateStr === localToday;
};

export const isFutureScheduled = (appt) => {
  if (!appt) return false;
  if (appt.status === 'completed' || appt.status === 'cancelled') return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tickets = Array.isArray(appt.queue_tickets) ? appt.queue_tickets : (appt.queue_tickets ? [appt.queue_tickets] : []);
  const relDate = appt.release_date || tickets[0]?.appointments?.release_date || tickets[0]?.release_date;
  return Boolean(relDate && relDate > todayStr);
};

export const isReadyForPickup = (appt) => {
  if (!appt) return false;
  if (appt.status === 'completed' || appt.status === 'cancelled') return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tickets = Array.isArray(appt.queue_tickets) ? appt.queue_tickets : (appt.queue_tickets ? [appt.queue_tickets] : []);
  const relDate = appt.release_date || tickets[0]?.appointments?.release_date || tickets[0]?.release_date;
  
  if (relDate && relDate > todayStr) {
    return false;
  }
  if (relDate && relDate <= todayStr) {
    return true;
  }
  return false;
};

export const getEffectiveStatus = (appt) => {
  if (!appt) return 'pending';
  if (appt.status === 'cancelled') return 'cancelled';
  if (appt.status === 'completed') return 'completed';
  if (isFutureScheduled(appt)) return 'scheduled_release';
  if (isReadyForPickup(appt)) return 'ready_for_pickup';
  return appt.status || 'pending';
};

function AppointmentDetailsContent({ 
  selectedAppt, 
  navigate, 
  setReschedulingAppt, 
  setConfirmCancelId, 
  canReschedule, 
  cancelling, 
  fmt12h,
  isMobileModal = false,
  onCloseMobileModal
}) {
  if (!selectedAppt) return null;
  const selEff = getEffectiveStatus(selectedAppt)
  const selStatusObj = STATUS[selEff] || STATUS.pending
  const isSelReady = selEff === 'ready_for_pickup'
  const isSelScheduled = selEff === 'scheduled_release'
  const isSelCompleted = selEff === 'completed'
  const isSelCancelled = selEff === 'cancelled'

  return (
    <div className="flex flex-col flex-1 h-full">
      {!isMobileModal && (
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
          <div>
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-1.5">TRANSACTION OVERVIEW</p>
            <h2 className="font-serif text-[22px] font-bold text-text-main m-0 mb-2">{selectedAppt.transaction_types?.name || 'Transaction'}</h2>
            <span className="text-[11.5px] font-bold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5" style={{ background: selStatusObj.bg, color: selStatusObj.color, border: `1px solid ${selStatusObj.border}` }}>
              {isSelReady ? <FileCheck size={13} /> : isSelScheduled ? <Calendar size={13} /> : isSelCompleted ? <CheckCircle size={13} /> : null} {selStatusObj.label}
            </span>
          </div>
        </div>
      )}

      {isMobileModal && (
        <div className="mb-4">
          <span className="text-[11.5px] font-bold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5" style={{ background: selStatusObj.bg, color: selStatusObj.color, border: `1px solid ${selStatusObj.border}` }}>
            {isSelReady ? <FileCheck size={13} /> : isSelScheduled ? <Calendar size={13} /> : isSelCompleted ? <CheckCircle size={13} /> : null} {selStatusObj.label}
          </span>
        </div>
      )}

      {isSelScheduled ? (
        <div className="flex flex-col flex-1">
          <div className="bg-gold/8 border border-gold/25 rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shrink-0 shadow-sm">
                <Calendar size={22} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Scheduled for Release</h4>
                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                  Your document is currently being prepared and processed in the back office. It is scheduled for release on <strong>{new Date(selectedAppt.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <Calendar size={12} className="text-gold" /> CLAIM DATE
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">
                {new Date(selectedAppt.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-[12px] text-text-sub m-0">On or after this date</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-maroon" /> PICKUP LOCATION
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Registrar's Office</p>
              <p className="text-[12px] text-text-sub m-0">Window 1 / Releasing Counter</p>
            </div>
          </div>
        </div>
      ) : isSelReady ? (
        <div className="flex flex-col flex-1">
          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileCheck size={22} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Document Ready for Collection</h4>
                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                  Your requested official document is verified, printed, sealed, and ready for claiming at the Registrar's Office.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-maroon" /> PICKUP LOCATION
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Registrar's Office</p>
              <p className="text-[12px] text-text-sub m-0">Window 1 / Releasing Counter</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <Clock size={12} className="text-gold" /> OFFICE HOURS
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Mon – Fri (8:00 AM – 5:00 PM)</p>
              <p className="text-[12px] text-text-sub m-0">Excluding official holidays</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-success" /> WHAT TO PRESENT UPON CLAIMING
            </p>
            <div className="flex flex-col gap-2 text-[13px] text-text-main">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-success-light text-success flex items-center justify-center text-[10px] font-bold">✓</div>
                <span>Digital Claim Stub / Active Queue Number on this app</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] text-text-sub mb-6 border-t border-border pt-4">
            <div>
              <span className="font-semibold text-text-muted text-[11px] uppercase tracking-wider block mb-1">Appointment Schedule</span>
              <span className="font-bold text-text-main">{selectedAppt.appointment_date} at {fmt12h(selectedAppt.time_slot)}</span>
            </div>
            <div>
              <span className="font-semibold text-text-muted text-[11px] uppercase tracking-wider block mb-1">Recorded Purpose</span>
              <span className="font-bold text-text-main">{selectedAppt.notes || 'Official Document Request'}</span>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={() => {
                if (onCloseMobileModal) onCloseMobileModal();
                navigate('/student/queue?tab=active');
              }} 
              className="w-full py-3.5 px-4 text-[14px] font-bold text-white bg-success border-none rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-success-dark transition-all shadow-sm hover:-translate-y-0.5"
            >
              <FileCheck size={18} /> View Digital Claim Stub
            </button>
          </div>
        </div>
      ) : isSelCompleted ? (
        <div className="flex flex-col flex-1">
          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle size={22} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Document Officially Released</h4>
                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                  This document was verified, claimed, and released by the Registrar's Office. The transaction is marked complete.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3.5 flex items-center gap-1.5">
              <Building2 size={12} className="text-maroon" /> TRANSACTION SUMMARY
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">DOCUMENT</span>
                <span className="font-bold text-text-main">{selectedAppt.transaction_types?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">APPOINTMENT DATE</span>
                <span className="font-bold text-text-main">{selectedAppt.appointment_date}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">PRIORITY CLASSIFICATION</span>
                <span className="font-bold text-text-main capitalize">{selectedAppt.priority_class}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">STATUS</span>
                <span className="font-bold text-success">Official Release Completed</span>
              </div>
            </div>
            {selectedAppt.notes && (
              <div className="mt-4 pt-3.5 border-t border-border text-[12.5px]">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">PURPOSE / REMARKS</span>
                <span className="text-text-main font-medium">{selectedAppt.notes}</span>
              </div>
            )}
          </div>

          <div className="p-4.5 rounded-2xl bg-white border border-border text-[12.5px] text-text-sub leading-relaxed mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="font-bold text-text-main m-0 mb-1 flex items-center gap-1.5"><Sparkles size={14} className="text-gold" /> Need another document copy?</p>
            Please keep your physical document secure. If you require additional official certifications or records, you can submit a new appointment request anytime.
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={() => {
                if (onCloseMobileModal) onCloseMobileModal();
                navigate('/student/book');
              }} 
              className="w-full py-3.5 px-4 text-[13.5px] font-bold text-maroon bg-maroon-light border border-maroon-border rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-maroon hover:text-white transition-all shadow-xs"
            >
              <PlusCircle size={16} /> Request Another Document
            </button>
          </div>
        </div>
      ) : isSelCancelled ? (
        <div className="flex flex-col flex-1">
          <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-maroon text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment Cancelled</h4>
                <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                  This appointment slot was cancelled. You may schedule a new appointment whenever you are ready.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
              <Building2 size={12} className="text-maroon" /> CANCELLED BOOKING RECORD
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Transaction</span>
                <span className="font-bold text-text-main">{selectedAppt.transaction_types?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Original Date</span>
                <span className="font-bold text-text-main">{selectedAppt.appointment_date} ({fmt12h(selectedAppt.time_slot)})</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={() => {
                if (onCloseMobileModal) onCloseMobileModal();
                navigate('/student/book');
              }} 
              className="w-full py-3.5 px-4 text-[13.5px] font-bold text-white bg-maroon border-none rounded-xl font-sans flex items-center justify-center gap-2 cursor-pointer hover:bg-maroon-dark transition-all shadow-xs"
            >
              <PlusCircle size={16} /> Book New Appointment
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          {isAppointmentToday(selectedAppt.appointment_date) ? (
            <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap size={22} className="text-white fill-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment is Today!</h4>
                  <p className="text-[12.5px] text-text-sub m-0 leading-relaxed mb-3">
                    When you arrive at the Registrar's Office, activate your ticket on the <strong className="text-maroon font-semibold">Upcoming</strong> tab to enter the live waiting line.
                  </p>
                  <button
                    onClick={() => {
                      if (onCloseMobileModal) onCloseMobileModal();
                      navigate('/student/queue?tab=upcoming');
                    }}
                    className="py-2 px-3.5 text-[12px] font-bold text-white bg-maroon border-none rounded-lg font-sans inline-flex items-center gap-1.5 cursor-pointer hover:bg-maroon-dark transition-colors shadow-2xs"
                  >
                    <Zap size={14} className="fill-white" /> Go to Upcoming Tickets
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Calendar size={22} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Appointment Confirmed & Reserved</h4>
                  <p className="text-[12.5px] text-text-sub m-0 leading-relaxed">
                    Your appointment slot is reserved. Please review the checklist below and bring all required items on your scheduled day.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <Calendar size={12} className="text-gold" /> SCHEDULED DATE & TIME
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">{selectedAppt.appointment_date}</p>
              <p className="text-[12px] text-text-sub m-0">{fmt12h(selectedAppt.time_slot)}</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-maroon" /> LOCATION & COUNTER
              </p>
              <p className="text-[13.5px] font-bold text-text-main m-0 mb-0.5">Registrar's Office</p>
              <p className="text-[12px] text-text-sub m-0">Service Windows 1 – 4</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-2.5 flex items-center gap-1.5">
              <Tag size={12} className="text-gold" /> APPOINTMENT DETAILS
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Priority Lane</span>
                <span className="font-bold text-text-main capitalize">{selectedAppt.priority_class || 'Regular'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Stated Purpose</span>
                <span className="font-bold text-text-main">{selectedAppt.notes || 'Official Registrar Request'}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-border mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-maroon" /> REQUIRED DOCUMENTS TO BRING
            </p>
            <div className="flex flex-col gap-2 text-[13px] text-text-main">
              {selectedAppt.transaction_types?.required_documents?.length > 0 ? (
                selectedAppt.transaction_types.required_documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                    <span>{doc}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-4.5 h-4.5 rounded-full bg-success-light border border-success-border text-success flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                  <span>Valid Student ID / Official School Registration Form</span>
                </div>
              )}
            </div>
          </div>

          {selectedAppt.transaction_types?.processing_steps?.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase m-0 mb-3 flex items-center gap-1.5">
                <Clock size={12} className="text-gold" /> SERVICE WORKFLOW AT COUNTER
              </p>
              <div className="flex flex-col gap-2">
                {selectedAppt.transaction_types.processing_steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px] font-medium text-text-main p-2.5 rounded-xl bg-white border border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                    <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-bold text-maroon shrink-0 shadow-2xs">
                      {i + 1}
                    </div>
                    <span>{typeof step === 'object' ? step.name : step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'pending') && (
            <div className="mt-auto pt-4 border-t border-border">
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (onCloseMobileModal) onCloseMobileModal();
                    setReschedulingAppt(selectedAppt);
                  }} 
                  disabled={cancelling === selectedAppt.id || !canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot)}
                  className={`flex-1 py-3 px-4 text-[13px] font-bold text-text-main bg-white border-[1.5px] border-border rounded-xl font-sans transition-all ${(!canReschedule(selectedAppt.appointment_date, selectedAppt.time_slot) || cancelling === selectedAppt.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-off-white hover:border-text-sub/40'}`}
                >
                  Reschedule
                </button>
                <button 
                  onClick={() => {
                    if (onCloseMobileModal) onCloseMobileModal();
                    setConfirmCancelId(selectedAppt.id);
                  }} 
                  disabled={cancelling === selectedAppt.id}
                  className={`flex-1 py-3 px-4 text-[13px] font-bold text-maroon bg-transparent border-[1.5px] border-maroon-border rounded-xl font-sans transition-all ${cancelling === selectedAppt.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-maroon-light hover:border-maroon'}`}
                >
                  {cancelling === selectedAppt.id ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
              <p className="text-[11px] text-text-muted text-center m-0 mt-2.5">
                * Rescheduling is allowed up to 24 hours prior to appointment time.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAppointments() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [selectedApptId, setSelectedApptId] = useState(null)
  const [isMobileViewingDetails, setIsMobileViewingDetails] = useState(false)
  
  const selectedAppt = useMemo(() => {
    return appointments.find(a => a.id === selectedApptId) || null
  }, [appointments, selectedApptId])

  const fmt12h = (t) => {
    if (!t) return ''
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const suffix = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${suffix}`
  }
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
  const [reschedulingAppt, setReschedulingAppt] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const canReschedule = (apptDateStr, apptTimeStr) => {
    if (!apptDateStr || !apptTimeStr) return false;
    const [year, month, day] = apptDateStr.split('-').map(Number);
    const [hour, min] = apptTimeStr.split(':').map(Number);
    const apptDate = new Date(year, month - 1, day, hour, min);
    const now = new Date();
    const diffHours = (apptDate - now) / (1000 * 60 * 60);
    return diffHours >= 24;
  }

  const fetch = useCallback(async () => {
    try { 
      const data = await getMyAppointments(token)
      setAppointments(data || [])
      if (data && data.length > 0) {
        setSelectedApptId(prev => {
          if (prev && data.some(a => a.id === prev)) return prev
          return data[0].id
        })
      }
    }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])
  
  useEffect(() => { fetch() }, [fetch])

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return
    const id = confirmCancelId
    setConfirmCancelId(null)
    setCancelling(id)
    try { await cancelAppointment(token, id); await fetch(); setSuccessMsg('Appointment cancelled successfully.') }
    catch (e) { setError(e.message) }
    finally { setCancelling(null); setTimeout(() => setSuccessMsg(''), 4000) }
  }

  const handleClearCancelled = async () => {
    setShowClearConfirm(false)
    setClearingAll(true)
    try { 
      await clearCancelledAppointments(token)
      await fetch()
      setSuccessMsg('All cancelled appointments have been cleared.')
    }
    catch (e) { setError(e.message) }
    finally { setClearingAll(false); setTimeout(() => setSuccessMsg(''), 4000) }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const effStatus = getEffectiveStatus(appt);
      if (filter === 'all') return true;
      if (filter === 'scheduled_release') return effStatus === 'scheduled_release';
      if (filter === 'ready_for_pickup') return effStatus === 'ready_for_pickup';
      if (filter === 'confirmed') return effStatus === 'confirmed';
      return appt.status === filter;
    }).sort((a, b) => {
      const aEff = getEffectiveStatus(a);
      const bEff = getEffectiveStatus(b);
      const aEnd = a.status === 'completed' || a.status === 'cancelled';
      const bEnd = b.status === 'completed' || b.status === 'cancelled';
      
      if (aEnd && !bEnd) return 1;
      if (!aEnd && bEnd) return -1;

      if (aEff === 'ready_for_pickup' && bEff !== 'ready_for_pickup') return -1;
      if (aEff !== 'ready_for_pickup' && bEff === 'ready_for_pickup') return 1;

      if (aEff === 'scheduled_release' && bEff !== 'scheduled_release') return -1;
      if (aEff !== 'scheduled_release' && bEff === 'scheduled_release') return 1;
      
      if (aEnd && bEnd) {
        const dateCmp = (b.appointment_date || '').localeCompare(a.appointment_date || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.time_slot || '').localeCompare(a.time_slot || '');
      }
      
      const dateCmp = (a.appointment_date || '').localeCompare(b.appointment_date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.time_slot || '').localeCompare(b.time_slot || '');
    })
  }, [appointments, filter])

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  const options = [
    { value: 'all', label: 'All Appointments' },
    { value: 'scheduled_release', label: 'Scheduled for Release' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const hasCancelledAppointments = useMemo(() => {
    return appointments.some(a => a.status === 'cancelled');
  }, [appointments]);

  return (
    <StudentLayout activeTab="appointments" mobileTitle="My Appointments">
      <div className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 md:px-8 py-3 sm:py-6 pb-24 md:pb-12 box-border">
        
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-start mb-8">
          <div>
            <div className="text-[11px] font-bold text-gold uppercase tracking-[0.06em] mb-2">MY SCHEDULE</div>
            <h1 className="font-serif text-[26px] font-bold text-maroon m-0 mb-2 flex items-center gap-3">
              <Calendar className="text-maroon" size={24} /> My Appointments
            </h1>
            <p className="text-[12px] text-text-sub m-0 leading-relaxed max-w-162.5">
              View and manage your scheduled registrar appointments and document claiming details.
            </p>
          </div>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2 mt-2">
            <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
            <span className="text-border-strong">›</span>
            <span>Appointments</span>
          </div>
        </div>

        {/* Action Controls & Notifications (Hidden on mobile when viewing in-page details) */}
        <div className={`flex-col gap-4 mb-6 ${isMobileViewingDetails ? 'hidden md:flex' : 'flex'}`}>
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-[13px] font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-success-light border border-success-border text-success text-[13px] font-medium flex items-center gap-2">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CustomDropdown 
                value={filter} 
                onChange={(val) => {
                  setFilter(val)
                  setCurrentPage(1)
                }} 
                options={options} 
                icon={<Filter size={14} className="text-gold" />}
              />
            </div>

            {hasCancelledAppointments && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border border-red-200 bg-red-50/50 text-maroon hover:bg-red-50 text-xs sm:text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0 ml-auto"
                title="Clear all cancelled appointments"
              >
                <Trash2 size={13} className="sm:w-3.5 sm:h-3.5 text-danger" /> 
                <span>Clear Cancelled</span>
              </button>
            )}
          </div>
        </div>

        {/* ── MOBILE ONLY: In-Page Details View (No Modal) ── */}
        {isMobileViewingDetails && selectedAppt && (
          <div className="md:hidden animate-fade-up">
            <button
              onClick={() => setIsMobileViewingDetails(false)}
              className="flex items-center gap-1.5 text-[13px] font-bold text-maroon hover:text-maroon-dark bg-transparent border-none p-0 mb-4 cursor-pointer font-sans"
            >
              <ChevronLeft size={18} /> Back to Appointments
            </button>
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
              <AppointmentDetailsContent 
                selectedAppt={selectedAppt}
                navigate={navigate}
                setReschedulingAppt={setReschedulingAppt}
                setConfirmCancelId={setConfirmCancelId}
                canReschedule={canReschedule}
                cancelling={cancelling}
                fmt12h={fmt12h}
                isMobileModal={false}
              />
            </div>
          </div>
        )}

        {/* Main Content Layout (Desktop side-by-side, or Mobile list when NOT in details view) */}
        <div className={`flex-col md:flex-row md:gap-8 md:items-start ${isMobileViewingDetails ? 'hidden md:flex' : 'flex'}`}>
          
          {/* ── Left Column: Appointments List ── */}
          <div className="flex-1 w-full md:max-w-125">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                    <div className="animate-pulse flex justify-between items-start mb-3">
                      <div className="h-4.5 w-40 bg-border rounded" />
                      <div className="h-5 w-20 bg-border rounded-full" />
                    </div>
                    <div className="animate-pulse space-y-2">
                      <div className="h-3.5 w-48 bg-border/60 rounded" />
                      <div className="h-3.5 w-32 bg-border/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="animate-fade-up text-center py-16 px-8 bg-white rounded-2xl border border-border shadow-sm">
                <Inbox size={48} className="mx-auto text-gold mb-4" />
                <h3 className="font-semibold text-text-main m-0 mb-1">No appointments found</h3>
                <p className="text-[13px] text-text-sub">Try changing your filters or book a new appointment.</p>
              </div>
            ) : (
              <div className="animate-fade-up flex flex-col gap-3">
                {paginatedAppointments.map(appt => {
                  const effStatus = getEffectiveStatus(appt)
                  const s = STATUS[effStatus] || STATUS.pending
                  const isReady = effStatus === 'ready_for_pickup'
                  const isCompleted = effStatus === 'completed'
                  const isSelected = selectedAppt?.id === appt.id
                  return (
                    <div 
                      key={appt.id} 
                      onClick={() => {
                        setSelectedApptId(appt.id)
                        setIsMobileViewingDetails(true)
                      }}
                      className={`group bg-white rounded-2xl p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${isSelected ? 'md:ring-2 md:ring-maroon md:shadow-[0_4px_12px_rgba(123,26,42,0.15)]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <h3 className="font-serif text-[15.5px] font-bold text-text-main m-0 group-hover:text-maroon transition-colors">{appt.transaction_types?.name || 'Transaction'}</h3>
                        <span className="text-[11px] font-bold py-1 px-2.5 rounded-full whitespace-nowrap flex items-center gap-1 shrink-0 ml-2" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {isReady ? <FileCheck size={12} /> : isCompleted ? <CheckCircle size={12} /> : null} {s.label}
                        </span>
                      </div>
                      <div className="text-[13px] text-text-sub flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gold shrink-0" /> {appt.appointment_date} at {fmt12h(appt.time_slot)}</span>
                        <span className="flex items-center gap-1.5"><Tag size={13} className="text-gold shrink-0" /> Priority: <span className="capitalize font-semibold text-text-main ml-0.5">{appt.priority_class}</span></span>
                        {appt.notes && <span className="flex items-start gap-1.5"><FileText size={13} className="text-gold shrink-0 mt-0.5" /> <span className="truncate">{appt.notes}</span></span>}
                      </div>

                      <div className="flex justify-end items-center mt-3 pt-3 border-t border-border border-dashed text-[12px] font-bold text-maroon">
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          View Details <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* ── Pagination Controls ── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/80 flex-wrap gap-2">
                    <span className="text-[12px] font-semibold text-text-muted">
                      Page <strong className="text-text-main font-bold">{currentPage}</strong> of <strong className="text-text-main font-bold">{totalPages}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold flex items-center gap-1 transition-all ${
                          currentPage === 1 
                            ? 'bg-white border-border text-text-muted/40 cursor-not-allowed opacity-60' 
                            : 'bg-white border-border text-text-main hover:bg-slate-50 cursor-pointer shadow-2xs hover:border-maroon/30'
                        }`}
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(num => Math.abs(num - currentPage) <= 1 || num === 1 || num === totalPages)
                          .map((num, idx, arr) => {
                            const prevNum = arr[idx - 1];
                            const hasGap = prevNum && num - prevNum > 1;
                            return (
                              <React.Fragment key={num}>
                                {hasGap && <span className="px-0.5 text-text-muted text-[11px]">…</span>}
                                <button
                                  onClick={() => setCurrentPage(num)}
                                  className={`w-7 h-7 rounded-lg text-[12px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                    currentPage === num
                                      ? 'bg-maroon text-white shadow-2xs border border-maroon'
                                      : 'bg-white text-text-main border border-border hover:bg-slate-50 hover:border-maroon/30'
                                  }`}
                                >
                                  {num}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold flex items-center gap-1 transition-all ${
                          currentPage === totalPages 
                            ? 'bg-white border-border text-text-muted/40 cursor-not-allowed opacity-60' 
                            : 'bg-white border-border text-text-main hover:bg-slate-50 cursor-pointer shadow-2xs hover:border-maroon/30'
                        }`}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Column: Details (Desktop View) ── */}
          <div className="hidden md:flex flex-col flex-1 bg-white border border-border rounded-3xl p-8 shadow-sm">
            {selectedAppt ? (
              <div className="animate-fade-up flex flex-col h-full">
                <AppointmentDetailsContent 
                  selectedAppt={selectedAppt}
                  navigate={navigate}
                  setReschedulingAppt={setReschedulingAppt}
                  setConfirmCancelId={setConfirmCancelId}
                  canReschedule={canReschedule}
                  cancelling={cancelling}
                  fmt12h={fmt12h}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-20 text-text-muted">
                <Inbox size={40} className="mb-3 opacity-40 text-gold" />
                <p className="font-semibold text-[15px] m-0 text-text-main">No Appointment Selected</p>
                <p className="text-[13px] text-text-sub mt-1">Select an appointment from the list to view its complete details.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {reschedulingAppt && (
        <RescheduleModal
          appt={reschedulingAppt}
          token={token}
          onClose={() => setReschedulingAppt(null)}
          onSuccess={() => {
            setReschedulingAppt(null)
            fetch()
            setSuccessMsg('Appointment rescheduled successfully!')
            setTimeout(() => setSuccessMsg(''), 4000)
          }}
        />
      )}

      {confirmCancelId && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setConfirmCancelId(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 text-center shadow-xl border border-border z-10 animate-fade-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-maroon flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-serif text-[18px] font-bold text-text-main m-0 mb-2">Cancel Appointment?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed">
              Are you sure you want to cancel this appointment slot? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmCancelId(null)} 
                className="flex-1 py-2.5 px-3 rounded-xl border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer hover:bg-off-white transition-colors"
              >
                Keep It
              </button>
              <button 
                onClick={handleCancelConfirm} 
                className="flex-1 py-2.5 px-3 rounded-xl border-none bg-maroon text-white text-[13px] font-semibold cursor-pointer hover:bg-maroon-dark transition-colors shadow-xs"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setShowClearConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 text-center shadow-xl border border-border z-10 animate-fade-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-maroon flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="font-serif text-[18px] font-bold text-text-main m-0 mb-2">Clear Cancelled Appointments?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed">
              This will remove all cancelled appointment records from your view permanently.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowClearConfirm(false)} 
                disabled={clearingAll}
                className="flex-1 py-2.5 px-3 rounded-xl border border-border bg-white text-text-main text-[13px] font-semibold cursor-pointer hover:bg-off-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearCancelled} 
                disabled={clearingAll}
                className="flex-1 py-2.5 px-3 rounded-xl border-none bg-maroon text-white text-[13px] font-semibold cursor-pointer hover:bg-maroon-dark transition-colors shadow-xs disabled:opacity-50"
              >
                {clearingAll ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
