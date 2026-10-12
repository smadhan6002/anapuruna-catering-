import React, { useState } from 'react';
import { siteConfig } from '../config/site';
import { useLanguage } from '../context/LanguageContext';
import { generateMenuPDF } from '../utils/generateMenuPDF';
import heroImg from '../assets/Home section.jpg';

export const Hero: React.FC = () => {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadMenu() {
    setDownloading(true);
    try {
      await generateMenuPDF();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className="relative w-full h-[350px] md:h-[450px] lg:h-[550px] xl:h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${heroImg})`,
        }}
      />
      {/* Gradient Overlay for blending background smoothly at the bottom */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/10 via-white/40 to-slate-50" />

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto flex flex-col items-center mt-12 md:mt-24">
        <div className="flex items-center gap-2 text-primary font-medium text-sm tracking-wider uppercase mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          {t.welcome}
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 mb-4 tracking-tight px-4 w-full">
          {siteConfig.name}
        </h1>
        <p className="text-slate-600 text-lg md:text-xl mb-5">
          {t.heroDescription}
        </p>

        {/* Customer-facing Menu Download Button */}
        <button
          onClick={handleDownloadMenu}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/90 hover:bg-white text-slate-800 text-xs sm:text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 backdrop-blur-sm border border-slate-200/80 cursor-pointer disabled:opacity-60"
        >
          {downloading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>{t.lang === 'ta' ? 'பதிவிறக்கம் செய்யப்படுகிறது...' : 'Generating Menu PDF...'}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              <span>{t.lang === 'ta' ? 'உணவு மெனு PDF பதிவிறக்கு' : 'Download Food Menu PDF'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

