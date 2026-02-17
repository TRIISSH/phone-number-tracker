import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  Shield, 
  BookOpen, 
  X, 
  AlertTriangle,
  Terminal,
  MapPin,
  History,
  Lock,
  Eye
} from "lucide-react";
import { PhoneTracker } from "@/components/PhoneTracker";
import { IPTracker } from "@/components/IPTracker";
import { EducationalContent } from "@/components/EducationalContent";
import { LookupHistory } from "@/components/LookupHistory";

export default function HomePage() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [activeTab, setActiveTab] = useState("phone");

  const tabs = [
    { id: "phone", label: "Phone Tracker", icon: Phone },
    { id: "ip", label: "IP Tracker", icon: MapPin },
    { id: "education", label: "Learn", icon: BookOpen },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#050505] grid-pattern">
      {/* Disclaimer Banner */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="disclaimer-banner overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ffaa00]" />
                <span className="font-primary text-sm text-[#ffaa00]">
                  <strong>EDUCATIONAL PURPOSE ONLY:</strong> This platform demonstrates cybersecurity concepts. 
                  Unauthorized tracking is illegal. Use responsibly and ethically.
                </span>
              </div>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="p-1 hover:bg-[#ffffff10] rounded-none transition-colors"
                data-testid="close-disclaimer-btn"
              >
                <X className="w-4 h-4 text-[#ffaa00]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="hero-bg relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-6 h-6 text-[#00ff9d]" />
              <span className="font-primary text-xs text-[#888888] uppercase tracking-widest">
                Cybersecurity Education Platform
              </span>
            </div>
            
            <h1 
              className="font-secondary font-bold text-4xl sm:text-5xl lg:text-6xl text-white uppercase tracking-wider mb-4 glitch"
              data-text="NETSTALKER"
              data-testid="hero-title"
            >
              <span className="neon-green">NET</span>
              <span className="text-white">STALKER</span>
            </h1>
            
            <p className="font-primary text-base sm:text-lg text-[#888888] max-w-2xl mb-8">
              Learn how phone number tracking works in real-world cybersecurity scenarios. 
              Get exact locations with GPS coordinates displayed on an interactive map.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-[#00ff9d] font-primary text-xs">
                <Shield className="w-4 h-4" />
                <span>CONTROLLED ENVIRONMENT</span>
              </div>
              <div className="flex items-center gap-2 text-[#00d2ff] font-primary text-xs">
                <Lock className="w-4 h-4" />
                <span>EDUCATIONAL USE ONLY</span>
              </div>
              <div className="flex items-center gap-2 text-[#ff0055] font-primary text-xs">
                <MapPin className="w-4 h-4" />
                <span>GPS COORDINATES</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8" data-testid="tab-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button flex items-center gap-2 ${
                activeTab === tab.id ? "active" : ""
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "phone" && <PhoneTracker />}
            {activeTab === "education" && <EducationalContent />}
            {activeTab === "history" && <LookupHistory />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222222] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#00ff9d]" />
              <span className="font-secondary font-bold text-white uppercase tracking-wider">
                NetStalker
              </span>
            </div>
            <div className="font-primary text-xs text-[#666666]">
              <span className="text-[#ff0055]">WARNING:</span> For educational purposes only. 
              Unauthorized use may violate laws.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
