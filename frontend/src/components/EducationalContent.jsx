import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  BookOpen,
  Phone,
  Globe,
  Shield,
  Scale,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lock,
  Eye,
  Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const iconMap = {
  phone_tracking: Phone,
  ip_geolocation: Globe,
  privacy_protection: Shield,
  legal_ethical: Scale
};

export const EducationalContent = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/educational/content`);
        setContent(response.data);
      } catch (err) {
        setError("Failed to load educational content");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#00ff9d] animate-spin mb-4" />
        <p className="font-primary text-sm text-[#888888]">Loading educational content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#ff0055]">
        <AlertTriangle className="w-8 h-8 mb-4" />
        <p className="font-primary text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="educational-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tool-card p-6 bracket-corners"
      >
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-[#00ff9d]" />
          <h2 className="font-secondary font-bold text-2xl text-white uppercase tracking-wider">
            Educational Resources
          </h2>
        </div>
        
        <p className="font-primary text-sm text-[#888888] mb-6">
          Understanding how tracking technologies work is essential for protecting your privacy 
          and making informed decisions about your digital footprint.
        </p>

        {/* Disclaimer */}
        {content?.disclaimer && (
          <div className="bg-[#ff005510] border border-[#ff005550] p-4 rounded-none">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff0055] flex-shrink-0 mt-0.5" />
              <p className="font-primary text-sm text-[#ff0055]">
                {content.disclaimer}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Topics */}
      <div className="grid md:grid-cols-2 gap-6">
        {content?.topics?.map((topic, index) => {
          const IconComponent = iconMap[topic.id] || BookOpen;
          
          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="edu-card p-6"
              data-testid={`edu-topic-${topic.id}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#00ff9d10] border border-[#00ff9d30]">
                  <IconComponent className="w-5 h-5 text-[#00ff9d]" />
                </div>
                <h3 className="font-secondary font-bold text-lg text-white uppercase tracking-wider">
                  {topic.title}
                </h3>
              </div>

              <p className="font-primary text-sm text-[#888888] mb-6 leading-relaxed">
                {topic.content}
              </p>

              <div className="space-y-2">
                <span className="font-primary text-xs text-[#00d2ff] uppercase tracking-wider">
                  Key Points:
                </span>
                <ul className="space-y-2">
                  {topic.key_points?.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-[#00ff9d] flex-shrink-0 mt-0.5" />
                      <span className="font-primary text-xs text-[#e0e0e0]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="tool-card p-6"
      >
        <h3 className="font-secondary font-bold text-lg text-white uppercase tracking-wider mb-6">
          Frequently Asked Questions
        </h3>

        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="item-1" className="border border-[#333333] rounded-none bg-[#0a0a0a]">
            <AccordionTrigger className="px-4 py-3 font-primary text-sm text-[#e0e0e0] hover:text-[#00ff9d] hover:no-underline">
              Is phone number tracking legal?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 font-primary text-xs text-[#888888]">
              Phone number validation and carrier lookup using publicly available databases is legal. 
              However, tracking someone's real-time location without consent is illegal in most jurisdictions. 
              Always ensure you have proper authorization before conducting any investigation.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border border-[#333333] rounded-none bg-[#0a0a0a]">
            <AccordionTrigger className="px-4 py-3 font-primary text-sm text-[#e0e0e0] hover:text-[#00ff9d] hover:no-underline">
              How accurate is IP geolocation?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 font-primary text-xs text-[#888888]">
              IP geolocation accuracy varies significantly. Country-level accuracy is typically 95-99%, 
              while city-level accuracy ranges from 50-80% depending on the region. Urban areas tend to 
              have higher accuracy than rural locations. VPNs and proxies can completely mask true locations.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border border-[#333333] rounded-none bg-[#0a0a0a]">
            <AccordionTrigger className="px-4 py-3 font-primary text-sm text-[#e0e0e0] hover:text-[#00ff9d] hover:no-underline">
              How can I protect my privacy?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 font-primary text-xs text-[#888888]">
              Use reputable VPN services to mask your IP address. Consider using virtual phone numbers 
              for online registrations. Enable two-factor authentication on all accounts. Regularly 
              review privacy settings on social media and apps. Be cautious about sharing personal 
              information online.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border border-[#333333] rounded-none bg-[#0a0a0a]">
            <AccordionTrigger className="px-4 py-3 font-primary text-sm text-[#e0e0e0] hover:text-[#00ff9d] hover:no-underline">
              What data does this platform collect?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 font-primary text-xs text-[#888888]">
              This educational platform stores lookup queries for demonstration purposes only. 
              We do not collect personal information beyond what you voluntarily enter. 
              All lookups are performed using public databases and APIs. 
              This tool is designed for educational purposes to help understand tracking technologies.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>

      {/* Best Practices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <div className="tool-card p-4 border-l-2 border-l-[#00ff9d]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-[#00ff9d]" />
            <span className="font-secondary font-bold text-sm text-white uppercase">Protect</span>
          </div>
          <p className="font-primary text-xs text-[#888888]">
            Use VPNs and virtual numbers to protect your online identity.
          </p>
        </div>

        <div className="tool-card p-4 border-l-2 border-l-[#00d2ff]">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-[#00d2ff]" />
            <span className="font-secondary font-bold text-sm text-white uppercase">Aware</span>
          </div>
          <p className="font-primary text-xs text-[#888888]">
            Understand what information you're sharing online and with whom.
          </p>
        </div>

        <div className="tool-card p-4 border-l-2 border-l-[#ff0055]">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-[#ff0055]" />
            <span className="font-secondary font-bold text-sm text-white uppercase">Ethical</span>
          </div>
          <p className="font-primary text-xs text-[#888888]">
            Always obtain proper consent and follow legal requirements.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
