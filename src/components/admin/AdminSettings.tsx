import React, { useState } from 'react';
import {
  Settings,
  Database,
  MessageSquare,
  Check,
  Copy,
  Server,
} from 'lucide-react';
import { siteConfig } from '../../config/site';
import { campaignService } from '../../services/campaignService';
import { useLanguage } from '../../context/LanguageContext';

export const AdminSettings: React.FC = () => {
  const { lang } = useLanguage();
  const isTa = lang === 'ta';

  const [copied, setCopied] = useState(false);
  const isApiConfigured = campaignService.isApiConfigured();

  const envSample = `# Anapuruna Catering Environment Configuration
VITE_WHATSAPP_NUMBER=7200015790

# Official WhatsApp Business Cloud API (Meta)
VITE_WHATSAPP_API_TOKEN=your_meta_system_user_token_here
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_here

# Supabase Production Database Integration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
`;

  function copyEnv() {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {isTa ? 'நிர்வாக அமைப்புகள் (Settings)' : 'Admin System Settings'}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {isTa
            ? 'வணிக விவரங்கள், தரவுத்தளம் (Database) மற்றும் WhatsApp ஒருங்கிணைப்பு'
            : 'Configure business details, database connectivity, and WhatsApp Business API integration'}
        </p>
      </div>

      {/* Business Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          Catering Business Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-xs block mb-0.5">Catering Name</span>
            <span className="font-bold text-slate-900">{siteConfig.name}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-xs block mb-0.5">Registered WhatsApp Number</span>
            <span className="font-bold text-slate-900">+91 {siteConfig.whatsappNumber}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-xs block mb-0.5">Kitchen / Office Address</span>
            <span className="font-semibold text-slate-900">
              No. 25, Mandapam Street, Kanchipuram, Tamil Nadu – 631501
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-xs block mb-0.5">Food Standard</span>
            <span className="font-semibold text-green-700">100% Pure Vegetarian South Indian Catering</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Cloud API Integration Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            WhatsApp Business Integration
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isApiConfigured
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isApiConfigured ? 'Cloud API Active' : 'Direct Dispatch Active'}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          The catering platform operates using <strong>legally compliant WhatsApp integration</strong>. Customer inquiries and promotional greetings open directly via certified WhatsApp links.
          For background batch automation, add the Meta Business Cloud credentials into your environment.
        </p>
      </div>

      {/* Database Schema & Migration Guide */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database size={18} className="text-primary" />
            Database & Persistence Architecture
          </h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Server size={12} /> Hybrid Local & Supabase Ready
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          All orders, customer records, payment installments, and custom dishes are persisted safely.
          A complete SQL schema migration has been prepared in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">src/services/schema.sql</code> with full PostgreSQL tables, RLS policies, indexes, and relations.
        </p>

        {/* Copy sample .env */}
        <div className="relative bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
          <button
            onClick={copyEnv}
            className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-sans flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <pre className="whitespace-pre">{envSample}</pre>
        </div>
      </div>
    </div>
  );
};
