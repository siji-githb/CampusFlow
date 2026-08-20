export default function TermsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border bg-slate-50/50">
          <h2 className="text-[18px] font-bold text-text-main m-0 font-serif">Terms and Conditions</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 text-[13px] text-text-sub leading-relaxed font-sans scrollbar-hide">
          <p className="mb-4">
            Welcome to <strong>CampusFlow</strong>. By accessing or using our queueing and appointment management system, you agree to be bound by the following Terms and Conditions and Data Privacy Agreement. Please read them carefully before using the system.
          </p>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">
            By logging in and utilizing the CampusFlow platform, you signify your agreement to these Terms and Conditions. If you do not agree to any part of these terms, you may not use our service.
          </p>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">2. Description of Service</h3>
          <p className="mb-4">
            CampusFlow is a digital platform designed to streamline student transactions, queueing, and appointment scheduling with the college registrar and other campus offices. The system includes features for standard ticketing, appointment booking, and priority request processing for Persons with Disabilities (PWD) and pregnant students.
          </p>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">3. Data Privacy Agreement</h3>
          <p className="mb-2">We take your privacy seriously. CampusFlow complies with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and ensures that your personal information is protected.</p>
          
          <h4 className="text-[14px] font-bold text-text-main mt-4 mb-2">3.1. Collection of Personal Data</h4>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>Personal Identification:</strong> Full name, Student ID number, and email address.</li>
            <li><strong>Sensitive Personal Information (for Priority Requests only):</strong> If you apply for priority queueing, you may be asked to upload documents such as a PWD ID card or a Medical/Pregnancy Certificate.</li>
          </ul>

          <h4 className="text-[14px] font-bold text-text-main mt-4 mb-2">3.2. Purpose and Usage of Data</h4>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Authenticate your identity as an enrolled or alumni student.</li>
            <li>Manage your appointments and queue tickets efficiently.</li>
            <li>Verify your eligibility for priority services.</li>
          </ul>

          <h4 className="text-[14px] font-bold text-text-main mt-4 mb-2">3.3. AI Processing & Third-Party Disclosure</h4>
          <p className="mb-2">To expedite the verification of priority requests, CampusFlow utilizes automated Artificial Intelligence (AI) scanning services.</p>
          <div className="bg-maroon-light/20 border-l-4 border-maroon p-3 rounded-r-md mb-4 text-maroon-dark">
            <strong>IMPORTANT:</strong> By uploading a PWD ID or Medical Certificate, you consent to having the document temporarily scanned by a third-party AI vision model solely to extract text and verify the document's official formatting. The AI does NOT evaluate physical appearance and does not store the image after the scan is complete. Final approval is always conducted by a human staff member.
          </div>

          <h4 className="text-[14px] font-bold text-text-main mt-4 mb-2">3.4. Data Retention and Security</h4>
          <p className="mb-4">
            Your data is securely stored in our encrypted database. Uploaded priority documents are stored securely and are only accessible by authorized college staff. We will retain your data only for as long as necessary to fulfill the purposes outlined in this agreement or as required by college policy.
          </p>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">4. User Responsibilities</h3>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li>Provide accurate, current, and complete information.</li>
            <li>Never upload forged, falsified, or fraudulent documents for priority verification.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Not use the system to spam appointments or manipulate the queueing process.</li>
          </ul>
          <div className="bg-danger-light/30 border-l-4 border-danger p-3 rounded-r-md mb-4 text-danger-dark">
            <strong>CAUTION:</strong> Uploading fake documents (e.g., falsified medical certificates) is a violation of college policy and may result in disciplinary action.
          </div>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">5. Limitation of Liability</h3>
          <p className="mb-4">
            While we strive to provide a seamless experience, CampusFlow does not guarantee that the system will be entirely free from delays or technical interruptions. The college is not liable for missed appointments resulting from user error or failure to check notifications.
          </p>

          <h3 className="text-[15px] font-bold text-text-main mt-6 mb-2">6. Changes to Terms</h3>
          <p className="mb-6">
            We reserve the right to update these Terms and Conditions at any time. Significant changes regarding data privacy will be communicated to you via the system dashboard.
          </p>
          
          <p className="italic text-text-muted text-[12px] border-t border-border pt-4">
            By continuing to use CampusFlow, you acknowledge that you have read, understood, and agree to these Terms and Conditions and our Data Privacy Agreement.
          </p>
        </div>
        
        <div className="p-4 border-t border-border bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-maroon text-white font-bold text-[13px] border-none cursor-pointer hover:bg-maroon-dark transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
