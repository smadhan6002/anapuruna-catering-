import React, { useState, useMemo } from 'react';
import {
  Send,
  MessageSquare,
  Gift,
  Heart,
  Sparkles,
  Info,
  Users,
  Eye,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import {
  campaignService,
  MESSAGE_TEMPLATES,
  replacePlaceholders,
  type MessageTemplate,
} from '../../services/campaignService';
import { useLanguage } from '../../context/LanguageContext';
import type { CampaignType } from '../../types/admin';

export const AdminCampaigns: React.FC = () => {
  const { lang } = useLanguage();
  const isTa = lang === 'ta';

  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'setup'>('create');

  // Step 1: Message Type & Template Selection
  const [selectedType, setSelectedType] = useState<CampaignType>('Birthday Greetings');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(MESSAGE_TEMPLATES[0].id);
  const [messageLanguage, setMessageLanguage] = useState<'en' | 'ta'>('ta');

  // Step 2: Content & Customization
  const [messageText, setMessageText] = useState<string>(MESSAGE_TEMPLATES[0].templateTa);
  const [offerDetails, setOfferDetails] = useState<string>('');

  // Step 3: Audience & Recipients Filter
  const [recipientFilter, setRecipientFilter] = useState<
    'all_consented' | 'birthdays_this_month' | 'anniversaries_this_month' | 'selected'
  >('all_consented');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isTestSent, setIsTestSent] = useState(false);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'completed'>('idle');

  // Testing & Execution State
  const [testNumber, setTestNumber] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState('');

  const allCustomers = useMemo(() => customerService.getAll(), []);

  // Filter eligible recipients based on marketingConsent
  const eligibleRecipients = useMemo(() => {
    // CRITICAL REQUIREMENT: Strictly require marketingConsent
    const consented = allCustomers.filter((c) => c.marketingConsent === true);
    const currentMonth = new Date().getMonth() + 1; // 1-12

    if (recipientFilter === 'birthdays_this_month') {
      return consented.filter((c) => {
        if (!c.birthday) return false;
        const month = parseInt(c.birthday.split('-')[1], 10);
        return month === currentMonth;
      });
    }

    if (recipientFilter === 'anniversaries_this_month') {
      return consented.filter((c) => {
        if (!c.anniversaryDate) return false;
        const month = parseInt(c.anniversaryDate.split('-')[1], 10);
        return month === currentMonth;
      });
    }

    if (recipientFilter === 'selected') {
      return consented.filter((c) => selectedCustomerIds.includes(c.id));
    }

    return consented;
  }, [allCustomers, recipientFilter, selectedCustomerIds]);

  // When changing message type or template
  function handleSelectTemplate(tpl: MessageTemplate) {
    setSelectedTemplateId(tpl.id);
    setSelectedType(tpl.type);
    const text = messageLanguage === 'ta' ? tpl.templateTa : tpl.templateEn;
    setMessageText(text);
    const defaultOffer = messageLanguage === 'ta' ? tpl.defaultOfferTa : tpl.defaultOfferEn;
    if (defaultOffer) setOfferDetails(defaultOffer);
  }

  function handleLanguageToggle(newL: 'en' | 'ta') {
    setMessageLanguage(newL);
    const tpl = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setMessageText(newL === 'ta' ? tpl.templateTa : tpl.templateEn);
      const defaultOffer = newL === 'ta' ? tpl.defaultOfferTa : tpl.defaultOfferEn;
      if (defaultOffer) setOfferDetails(defaultOffer);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // Live preview customer
  const previewCustomer = useMemo(() => {
    return (
      eligibleRecipients[0] || {
        name: isTa ? 'சுரேஷ் குமார்' : 'Suresh Kumar',
        mobile: '9876543210',
      }
    );
  }, [eligibleRecipients, isTa]);

  const previewFormattedText = useMemo(() => {
    return replacePlaceholders(messageText, previewCustomer, offerDetails);
  }, [messageText, previewCustomer, offerDetails]);

  // Send Test Message via WhatsApp Web/App
  function handleSendTestMessage() {
    const clean = testNumber.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      alert('Please enter a valid 10-digit mobile number for test message.');
      return;
    }
    const url = campaignService.generateDirectWhatsAppLink(clean, previewFormattedText);
    window.open(url, '_blank');
    setIsTestSent(true);
    showToast(isTa ? 'சோதனை செய்தி WhatsApp-ல் திறக்கப்பட்டது' : 'Test message opened in WhatsApp.');
  }

  // Dispatch campaign
  function handleDispatchCampaign() {
    setShowConfirmModal(false);
    setSendingState('sending');

    const isApiReady = campaignService.isApiConfigured();

    // Record campaign record
    const tpl = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
    campaignService.create({
      title: tpl ? (messageLanguage === 'ta' ? tpl.titleTa : tpl.titleEn) : selectedType,
      type: selectedType,
      language: messageLanguage,
      messageTemplate: messageText,
      recipientFilter,
      recipientIds: eligibleRecipients.map((r) => r.id),
      recipientCount: eligibleRecipients.length,
      status: isApiReady ? 'Sent' : 'Ready',
      channel: isApiReady ? 'whatsapp_api' : 'whatsapp_direct',
      notes: isApiReady
        ? 'Dispatched via WhatsApp Business Cloud API'
        : 'Generated for 1-on-1 WhatsApp dispatch. Official API credentials not configured in environment.',
    });

    setTimeout(() => {
      setSendingState('completed');
      showToast(
        isApiReady
          ? 'Campaign successfully broadcast via WhatsApp Cloud API!'
          : 'Campaign prepared! You can now send directly to each recipient via WhatsApp.'
      );
    }, 1200);
  }

  const isApiConfigured = campaignService.isApiConfigured();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm">
          <Check size={16} className="text-green-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isTa ? 'வாடிக்கையாளர் செய்திகள் & பிரச்சாரங்கள்' : 'Customer Greetings & Promotions'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTa
              ? 'பிறந்தநாள், திருமண நாள், பண்டிகை வாழ்த்துகள் மற்றும் கேட்டரிங் சலுகைகளை அனுப்பவும்'
              : 'Send personalized festival greetings, birthday wishes, and promotional catering offers'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTa ? 'புதிய செய்தி' : 'New Greeting / Offer'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTa ? 'முந்தைய பிரச்சாரங்கள்' : 'Campaign History'}
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'setup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTa ? 'WhatsApp அமைப்பு' : 'WhatsApp API Setup'}
          </button>
        </div>
      </div>

      {/* API Status Notice */}
      {!isApiConfigured && activeTab === 'create' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">
              WhatsApp Business Cloud API Configuration Notice
            </span>
            <span>
              The server is currently operating in <strong>Direct WhatsApp Dispatch</strong> mode. Messages can be previewed, tested, and sent directly via WhatsApp click-to-chat. To enable automated bulk background sending via Meta, configure the official WhatsApp API credentials in your environment.
            </span>
            <button
              onClick={() => setActiveTab('setup')}
              className="mt-2 text-primary font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              View API Configuration Guide & Instructions →
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: CREATE & SEND */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Choose Template Category */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  1. Select Message Type & Template
                </h3>
                {/* Language Selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => handleLanguageToggle('ta')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      messageLanguage === 'ta' ? 'bg-white font-bold text-primary shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    தமிழ்
                  </button>
                  <button
                    onClick={() => handleLanguageToggle('en')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      messageLanguage === 'en' ? 'bg-white font-bold text-primary shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MESSAGE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const label = messageLanguage === 'ta' ? tpl.titleTa : tpl.titleEn;

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/70 border-primary text-slate-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <p className="truncate">{label}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{tpl.type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Message Content & Customization */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-primary" />
                2. Customize Message Text
              </h3>

              {/* Offer details optional placeholder input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Offer / Event Details ({'{{offer_details}}'})
                </label>
                <input
                  type="text"
                  placeholder={
                    isTa
                      ? 'எ.கா. 100 பேருக்கு மேல் முன்பதிவு செய்தால் 10% தள்ளுபடி!'
                      : 'e.g. 10% Early bird discount on bookings above 100 guests!'
                  }
                  value={offerDetails}
                  onChange={(e) => setOfferDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Message Template Content
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports {'{{customer_name}}'}, {'{{business_name}}'}, {'{{offer_details}}'}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Step 3: Audience & Recipients Filter */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-primary" />
                  3. Select Target Audience
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} /> {eligibleRecipients.length} Consented Recipients
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientFilter('all_consented')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    recipientFilter === 'all_consented'
                      ? 'bg-orange-50 border-primary text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users size={16} className="text-primary mb-1" />
                  <p>All Consented</p>
                  <span className="text-[10px] text-slate-500 font-normal">Active marketing opt-ins</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientFilter('birthdays_this_month')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    recipientFilter === 'birthdays_this_month'
                      ? 'bg-orange-50 border-primary text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Gift size={16} className="text-pink-600 mb-1" />
                  <p>Birthdays (This Month)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Matching birthday dates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientFilter('anniversaries_this_month')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    recipientFilter === 'anniversaries_this_month'
                      ? 'bg-orange-50 border-primary text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart size={16} className="text-rose-600 mb-1" />
                  <p>Anniversaries (This Month)</p>
                  <span className="text-[10px] text-slate-500 font-normal">Matching anniversary dates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientFilter('selected')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    recipientFilter === 'selected'
                      ? 'bg-orange-50 border-primary text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users size={16} className="text-blue-600 mb-1" />
                  <p>Pick Specific ({selectedCustomerIds.length})</p>
                  <span className="text-[10px] text-slate-500 font-normal">Choose individual customers</span>
                </button>
              </div>

              {/* Individual customer checklist if 'selected' is active */}
              {recipientFilter === 'selected' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-600 mb-1">Select Consented Customers:</p>
                  {allCustomers
                    .filter((c) => c.marketingConsent === true)
                    .map((c) => {
                      const isChecked = selectedCustomerIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerIds((prev) => [...prev, c.id]);
                              } else {
                                setSelectedCustomerIds((prev) => prev.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="font-medium text-slate-800">{c.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">({c.mobile})</span>
                        </label>
                      );
                    })}
                </div>
              )}

              {/* Opt-out protection notice */}
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck size={13} className="text-green-600 flex-shrink-0" />
                Customers who have opted out are strictly excluded from all promotional campaigns.
              </p>
            </div>
          </div>

          {/* Right Column: Live Preview & Dispatch (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live WhatsApp Message Preview Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Eye size={16} className="text-primary" />
                  Live Message Preview
                </h3>
                <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                  WhatsApp Preview
                </span>
              </div>

              {/* Chat Bubble Rendering */}
              <div className="bg-[#EFEAE2] p-4 rounded-xl border border-slate-200 shadow-inner">
                <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm text-slate-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-w-[95%]">
                  {previewFormattedText}
                  <div className="text-right text-[10px] text-slate-400 mt-2 font-mono">
                    Just now ✓✓
                  </div>
                </div>
              </div>

              {/* Recipient summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                <span>Total Target Audience:</span>
                <span className="font-bold text-slate-900">
                  {eligibleRecipients.length} customer(s)
                </span>
              </div>

              {/* Test Message Box */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Send Test Message
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send size={13} />
                    <span>{isTestSent ? 'Sent ✓' : 'Test'}</span>
                  </button>
                </div>
              </div>

              {/* Final Dispatch Button */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={eligibleRecipients.length === 0 || sendingState === 'sending'}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>
                    {sendingState === 'sending'
                      ? 'Dispatching...'
                      : isTa
                      ? `${eligibleRecipients.length} வாடிக்கையாளர்களுக்கு அனுப்பவும்`
                      : `Dispatch to ${eligibleRecipients.length} Customers`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">Campaign & Greetings History</h3>
            <span className="text-xs text-slate-500">
              {campaignService.getAll().length} recorded campaigns
            </span>
          </div>

          {campaignService.getAll().length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No promotional campaigns created yet. Start with a Birthday Greeting or Festive Offer!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {campaignService.getAll().map((cmp) => (
                <div key={cmp.id} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{cmp.id}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{cmp.title}</h4>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {cmp.type}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          cmp.status === 'Sent'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cmp.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cmp.messageTemplate}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                      <span>Created: {new Date(cmp.createdAt).toLocaleDateString('en-IN')}</span>
                      <span>Target: {cmp.recipientCount} customer(s)</span>
                      <span>Channel: {cmp.channel === 'whatsapp_api' ? 'Cloud API' : 'Direct WhatsApp'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHATSAPP BUSINESS CLOUD API SETUP */}
      {activeTab === 'setup' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <HelpCircle size={20} className="text-primary" />
              Official WhatsApp Business Cloud API Integration Guide
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Instructions to configure official, legally compliant automated bulk WhatsApp messaging for Anapuruna Catering.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Required Environment Variables:</h4>
              <ul className="space-y-1.5 font-mono text-xs text-slate-800">
                <li>• <strong className="text-primary">VITE_WHATSAPP_API_TOKEN</strong>: Meta System User Permanent Access Token</li>
                <li>• <strong className="text-primary">VITE_WHATSAPP_PHONE_NUMBER_ID</strong>: Phone Number ID from WhatsApp App Dashboard</li>
                <li>• <strong className="text-primary">VITE_WHATSAPP_BUSINESS_ACCOUNT_ID</strong>: WABA ID</li>
                <li>• <strong className="text-primary">VITE_WHATSAPP_NUMBER</strong>: Primary contact phone number (Default: 7200015790)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Step-by-Step Setup:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>Create a Meta Developer Account at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">developers.facebook.com</a>.</li>
                <li>Create an App with type <strong>Business</strong> and add the <strong>WhatsApp</strong> product.</li>
                <li>Verify your Business profile and register your Catering phone number.</li>
                <li>Create and submit template messages in Meta WhatsApp Manager for Birthday and Festival wishes.</li>
                <li>Add the environment variables into your deployment environment or <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> file.</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600 flex-shrink-0" />
              <span>
                <strong>Compliance Note:</strong> Only approved Meta message templates can be broadcast to customers outside the 24-hour customer care window. Our system automatically respects marketing consent.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Sending to Multiple Customers */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Confirm Promotional Broadcast
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              You are about to dispatch this <strong>{selectedType}</strong> message to{' '}
              <strong>{eligibleRecipients.length} consented customer(s)</strong>.
            </p>

            <div className="bg-orange-50/60 border border-orange-200 p-3 rounded-xl mb-5 text-xs text-orange-950">
              <p className="font-semibold mb-1">Message Preview:</p>
              <p className="italic line-clamp-3">"{previewFormattedText.substring(0, 140)}…"</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchCampaign}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
