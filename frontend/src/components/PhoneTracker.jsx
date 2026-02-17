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
  Wifi,
  Navigation,
  Crosshair,
  AlertTriangle
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
        toast.success("Phone number located successfully");
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

  // Calculate marker position on the map placeholder (simple projection)
  const getMarkerPosition = (lat, lon) => {
    const x = ((lon + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="space-y-8">
      {/* Top Section: Input and Map */}
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
            Enter a phone number to retrieve carrier information, location data, and 
            <span className="text-[#00ff9d]"> exact GPS coordinates</span> displayed on the map.
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
                placeholder="+91 98765 43210 or +1 555 123 4567"
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
                placeholder="IN, US, UK, DE..."
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
                  Locating...
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 mr-2" />
                  Track & Locate
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
              {["+91 98765 43210", "+91 99999 12345", "+1 650 253 0000", "+44 20 7946 0958"].map((num) => (
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

        {/* Map Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Map Visualization */}
          <div className="map-placeholder h-80 relative rounded-none overflow-hidden" data-testid="phone-map">
            <div className="map-grid" />
            
            {/* World map background with grid */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!result && !loading && (
                <div className="text-[#333333] font-primary text-sm text-center">
                  <MapPin className="w-16 h-16 mx-auto mb-2 opacity-20" />
                  <span>Enter a phone number to locate</span>
                </div>
              )}
              
              {loading && (
                <div className="text-[#00ff9d] text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                  <span className="font-primary text-sm">Triangulating position...</span>
                </div>
              )}

              {result && result.valid && result.location && result.location.latitude && (
                <>
                  {/* Location marker */}
                  <div 
                    className="location-marker"
                    style={getMarkerPosition(result.location.latitude, result.location.longitude)}
                  />
                  
                  {/* Pulse rings */}
                  <div 
                    className="absolute w-32 h-32 border border-[#ff005550] rounded-full animate-ping"
                    style={{
                      ...getMarkerPosition(result.location.latitude, result.location.longitude),
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </>
              )}
            </div>

            {/* Coordinates overlay */}
            {result && result.valid && result.location && result.location.latitude && (
              <div className="absolute bottom-4 left-4 bg-black/90 p-4 border border-[#00ff9d]">
                <div className="font-primary text-xs text-[#888888] uppercase mb-1">GPS Coordinates</div>
                <div className="font-primary text-lg text-[#00ff9d] font-bold">
                  {result.location.latitude.toFixed(4)}°, {result.location.longitude.toFixed(4)}°
                </div>
                <div className="font-primary text-xs text-[#00d2ff] mt-1">
                  {result.location.region || result.location.city || result.location.country}
                </div>
              </div>
            )}

            {/* Country indicator */}
            {result && result.valid && result.location && (
              <div className="absolute top-4 right-4 bg-black/90 p-3 border border-[#333333]">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00d2ff]" />
                  <span className="font-primary text-sm text-white">
                    {result.location.country}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {result && result.valid && result.location && result.location.latitude && (
            <div className="grid grid-cols-2 gap-4">
              <div className="tool-card p-4 border-l-2 border-l-[#00ff9d]">
                <div className="font-primary text-xs text-[#555555] uppercase">Latitude</div>
                <div className="font-secondary font-bold text-xl text-[#00ff9d]">
                  {result.location.latitude.toFixed(4)}°
                </div>
              </div>
              <div className="tool-card p-4 border-l-2 border-l-[#00d2ff]">
                <div className="font-primary text-xs text-[#555555] uppercase">Longitude</div>
                <div className="font-secondary font-bold text-xl text-[#00d2ff]">
                  {result.location.longitude.toFixed(4)}°
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Results Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`result-panel p-6 ${result ? (result.valid ? 'success' : 'error') : ''}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Signal className="w-5 h-5 text-[#00d2ff]" />
          <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
            Analysis Results
          </h2>
        </div>

        {!result && !error && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-[#555555]">
            <Phone className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-primary text-sm">Enter a phone number to begin analysis</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-32">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
            </div>
            <p className="font-primary text-sm text-[#00ff9d] mt-4">Querying databases...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-32 text-[#ff0055]">
            <XCircle className="w-12 h-12 mb-4" />
            <p className="font-primary text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="phone-results">
            {/* Validation Status */}
            <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
              <span className="data-label block mb-1">Status</span>
              <span className={`data-value flex items-center gap-2 text-lg ${result.valid ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                {result.valid ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {result.valid ? "VALID" : "INVALID"}
              </span>
            </div>

            {/* Phone Number */}
            <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
              <span className="data-label block mb-1">Number</span>
              <span className="data-value text-lg">{result.formatted_international || result.phone_number}</span>
            </div>

            {/* Country Code */}
            {result.country_code && (
              <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                <span className="data-label block mb-1">Country Code</span>
                <span className="data-value text-lg">{result.country_code}</span>
              </div>
            )}

            {/* Number Type */}
            {result.number_type && (
              <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                <span className="data-label block mb-1">Type</span>
                <span className="data-value flex items-center gap-2 text-lg">
                  {result.number_type === "MOBILE" && <Smartphone className="w-5 h-5" />}
                  {result.number_type === "FIXED_LINE" && <Phone className="w-5 h-5" />}
                  {result.number_type === "VOIP" && <Wifi className="w-5 h-5" />}
                  {result.number_type}
                </span>
              </div>
            )}

            {/* Carrier Info */}
            {result.carrier && (
              <>
                <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                  <span className="data-label block mb-1">Carrier</span>
                  <span className="data-value flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5" />
                    {result.carrier.name || "Unknown"}
                  </span>
                </div>
                <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                  <span className="data-label block mb-1">Line Type</span>
                  <span className="data-value uppercase text-lg">{result.carrier.line_type}</span>
                </div>
              </>
            )}

            {/* Location Info */}
            {result.location && (
              <>
                <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                  <span className="data-label block mb-1">Country</span>
                  <span className="data-value flex items-center gap-2 text-lg">
                    <Globe className="w-5 h-5" />
                    {result.location.country} ({result.location.country_code})
                  </span>
                </div>
                {result.location.region && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                    <span className="data-label block mb-1">Region/City</span>
                    <span className="data-value flex items-center gap-2 text-lg">
                      <MapPin className="w-5 h-5" />
                      {result.location.region}
                    </span>
                  </div>
                )}
                {result.location.telecom_circle && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#ff0055]">
                    <span className="data-label block mb-1">Telecom Circle</span>
                    <span className="data-value flex items-center gap-2 text-lg text-[#ff0055]">
                      <Signal className="w-5 h-5" />
                      {result.location.telecom_circle}
                    </span>
                  </div>
                )}
                {result.location.latitude && result.location.longitude && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#00ff9d] col-span-full md:col-span-2">
                    <span className="data-label block mb-1">GPS Coordinates</span>
                    <span className="data-value flex items-center gap-2 text-xl text-[#00ff9d]">
                      <Navigation className="w-5 h-5" />
                      {result.location.latitude.toFixed(4)}°, {result.location.longitude.toFixed(4)}°
                    </span>
                  </div>
                )}
                {result.location.timezone && result.location.timezone.length > 0 && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                    <span className="data-label block mb-1">Timezone</span>
                    <span className="data-value flex items-center gap-2 text-lg">
                      <Clock className="w-5 h-5" />
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
