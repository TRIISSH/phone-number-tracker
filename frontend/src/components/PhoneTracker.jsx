import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Phone,
  Search,
  MapPin,
  Building2,
  Signal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Smartphone,
  Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PhoneTracker = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API}/phone/lookup`, {
        phone_number: phoneNumber,
        country_code: countryCode || null
      });
      
      setResult(response.data);
      if (response.data.valid) {
        toast.success("Phone number validated successfully");
      } else {
        toast.warning("Phone number appears to be invalid");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to lookup phone number";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Input Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="tool-card p-6 bracket-corners"
      >
        <div className="flex items-center gap-3 mb-6">
          <Phone className="w-5 h-5 text-[#00ff9d]" />
          <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
            Phone Number Tracker
          </h2>
        </div>

        <p className="font-primary text-sm text-[#888888] mb-6">
          Enter a phone number to retrieve carrier information, location data, and validation status.
          Include country code for international numbers (e.g., +1 for US).
        </p>

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="font-primary text-xs text-[#888888] uppercase tracking-wider mb-2 block">
              Phone Number
            </label>
            <Input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 555 123 4567"
              className="terminal-input w-full h-12 px-4 text-base rounded-none"
              disabled={loading}
              data-testid="phone-input"
            />
          </div>

          <div>
            <label className="font-primary text-xs text-[#888888] uppercase tracking-wider mb-2 block">
              Country Code (Optional)
            </label>
            <Input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="US, UK, DE..."
              maxLength={2}
              className="terminal-input w-full h-12 px-4 text-base rounded-none uppercase"
              disabled={loading}
              data-testid="country-code-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-none border border-[#00ff9d] bg-transparent text-[#00ff9d] hover:bg-[#00ff9d] hover:text-black font-secondary font-bold uppercase tracking-widest text-sm transition-colors duration-200"
            data-testid="phone-lookup-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Track Number
              </>
            )}
          </Button>
        </form>

        {/* Sample Numbers */}
        <div className="mt-6 pt-6 border-t border-[#222222]">
          <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
            Try sample numbers:
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {["+1 650 253 0000", "+91 98765 43210", "+44 20 7946 0958", "+49 172 1234567"].map((num) => (
              <button
                key={num}
                onClick={() => setPhoneNumber(num)}
                className="font-primary text-xs text-[#00ff9d] hover:text-[#00d2ff] cursor-pointer transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Results Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`result-panel p-6 ${result ? (result.valid ? 'success' : 'error') : ''}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Signal className="w-5 h-5 text-[#00d2ff]" />
          <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
            Analysis Results
          </h2>
        </div>

        {!result && !error && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-[#555555]">
            <Phone className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-primary text-sm">Enter a phone number to begin analysis</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-[#050505] rounded-full" />
              </div>
            </div>
            <p className="font-primary text-sm text-[#00ff9d] mt-4">Querying databases...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-64 text-[#ff0055]">
            <XCircle className="w-12 h-12 mb-4" />
            <p className="font-primary text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-1" data-testid="phone-results">
            {/* Validation Status */}
            <div className="data-row">
              <span className="data-label">Status</span>
              <span className={`data-value flex items-center gap-2 ${result.valid ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                {result.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.valid ? "VALID" : "INVALID"}
              </span>
            </div>

            {/* Phone Number */}
            <div className="data-row">
              <span className="data-label">Number</span>
              <span className="data-value">{result.phone_number}</span>
            </div>

            {/* Formatted Numbers */}
            {result.formatted_international && (
              <div className="data-row">
                <span className="data-label">International</span>
                <span className="data-value">{result.formatted_international}</span>
              </div>
            )}

            {result.formatted_national && (
              <div className="data-row">
                <span className="data-label">National</span>
                <span className="data-value">{result.formatted_national}</span>
              </div>
            )}

            {/* Country Code */}
            {result.country_code && (
              <div className="data-row">
                <span className="data-label">Country Code</span>
                <span className="data-value">{result.country_code}</span>
              </div>
            )}

            {/* Number Type */}
            {result.number_type && (
              <div className="data-row">
                <span className="data-label">Type</span>
                <span className="data-value flex items-center gap-2">
                  {result.number_type === "MOBILE" && <Smartphone className="w-4 h-4" />}
                  {result.number_type === "FIXED_LINE" && <Phone className="w-4 h-4" />}
                  {result.number_type === "VOIP" && <Wifi className="w-4 h-4" />}
                  {result.number_type}
                </span>
              </div>
            )}

            {/* Carrier Info */}
            {result.carrier && (
              <>
                <div className="data-row">
                  <span className="data-label">Carrier</span>
                  <span className="data-value flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {result.carrier.name || "Unknown"}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Line Type</span>
                  <span className="data-value uppercase">{result.carrier.line_type}</span>
                </div>
              </>
            )}

            {/* Location Info */}
            {result.location && (
              <>
                <div className="data-row">
                  <span className="data-label">Country</span>
                  <span className="data-value flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {result.location.country} ({result.location.country_code})
                  </span>
                </div>
                {result.location.region && (
                  <div className="data-row">
                    <span className="data-label">Region</span>
                    <span className="data-value flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {result.location.region}
                    </span>
                  </div>
                )}
                {result.location.timezone && result.location.timezone.length > 0 && (
                  <div className="data-row">
                    <span className="data-label">Timezone</span>
                    <span className="data-value flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {result.location.timezone[0]}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
