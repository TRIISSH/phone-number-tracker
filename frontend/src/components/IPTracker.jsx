import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Globe,
  Search,
  MapPin,
  Building2,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Wifi,
  Navigation,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const IPTracker = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [myIP, setMyIP] = useState(null);

  useEffect(() => {
    // Fetch the server's public IP for demonstration
    const fetchMyIP = async () => {
      try {
        const response = await axios.get(`${API}/ip/me`);
        if (response.data.success) {
          setMyIP(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch server IP");
      }
    };
    fetchMyIP();
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    
    if (!ipAddress.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API}/ip/lookup`, {
        ip_address: ipAddress
      });
      
      setResult(response.data);
      if (response.data.success) {
        toast.success("IP address located successfully");
      } else {
        toast.warning("Could not locate IP address");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to lookup IP address";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Calculate marker position on the map placeholder
  const getMarkerPosition = (lat, lon) => {
    // Simple mercator projection for placeholder
    const x = ((lon + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { left: `${x}%`, top: `${y}%` };
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
          <Globe className="w-5 h-5 text-[#00ff9d]" />
          <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
            IP Address Locator
          </h2>
        </div>

        <p className="font-primary text-sm text-[#888888] mb-6">
          Enter an IPv4 or IPv6 address to retrieve geolocation data, ISP information, 
          and security indicators including VPN/proxy detection.
        </p>

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="font-primary text-xs text-[#888888] uppercase tracking-wider mb-2 block">
              IP Address
            </label>
            <Input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="8.8.8.8 or 2001:4860:4860::8888"
              className="terminal-input w-full h-12 px-4 text-base rounded-none"
              disabled={loading}
              data-testid="ip-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-none border border-[#00ff9d] bg-transparent text-[#00ff9d] hover:bg-[#00ff9d] hover:text-black font-secondary font-bold uppercase tracking-widest text-sm transition-colors duration-200"
            data-testid="ip-lookup-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Locate IP
              </>
            )}
          </Button>
        </form>

        {/* Sample IPs */}
        <div className="mt-6 pt-6 border-t border-[#222222]">
          <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
            Try sample IPs:
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {["8.8.8.8", "1.1.1.1", "208.67.222.222"].map((ip) => (
              <button
                key={ip}
                onClick={() => setIpAddress(ip)}
                className="font-primary text-xs text-[#00ff9d] hover:text-[#00d2ff] cursor-pointer transition-colors"
              >
                {ip}
              </button>
            ))}
          </div>
        </div>

        {/* Server IP Info */}
        {myIP && myIP.success && (
          <div className="mt-6 pt-6 border-t border-[#222222]">
            <span className="font-primary text-xs text-[#555555] uppercase tracking-wider block mb-2">
              Server Public IP:
            </span>
            <button
              onClick={() => setIpAddress(myIP.ip_address)}
              className="font-primary text-sm text-[#00d2ff] hover:text-[#00ff9d] cursor-pointer transition-colors"
            >
              {myIP.ip_address} ({myIP.location?.city}, {myIP.location?.country_code})
            </button>
          </div>
        )}
      </motion.div>

      {/* Results Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Map Placeholder */}
        <div className="map-placeholder h-64 relative rounded-none overflow-hidden" data-testid="ip-map">
          <div className="map-grid" />
          
          {/* World map overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!result && !loading && (
              <div className="text-[#333333] font-primary text-sm">
                <Globe className="w-16 h-16 mx-auto mb-2 opacity-20" />
                <span>Awaiting coordinates...</span>
              </div>
            )}
            
            {loading && (
              <div className="text-[#00ff9d]">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                <span className="font-primary text-sm">Triangulating position...</span>
              </div>
            )}

            {result && result.success && result.location && (
              <>
                {/* Location marker */}
                <div 
                  className="location-marker"
                  style={getMarkerPosition(result.location.latitude, result.location.longitude)}
                />
                
                {/* Coordinates overlay */}
                <div className="absolute bottom-4 left-4 bg-black/80 p-3 border border-[#333333]">
                  <div className="font-primary text-xs text-[#888888] uppercase">Coordinates</div>
                  <div className="font-primary text-sm text-[#00ff9d]">
                    {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Data */}
        <div className={`result-panel p-6 ${result ? (result.success ? 'success' : 'error') : ''}`}>
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-[#00d2ff]" />
            <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
              Location Data
            </h2>
          </div>

          {!result && !error && !loading && (
            <div className="flex flex-col items-center justify-center h-32 text-[#555555]">
              <Navigation className="w-8 h-8 mb-2 opacity-30" />
              <p className="font-primary text-sm">Enter an IP address to begin geolocation</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-32 text-[#ff0055]">
              <XCircle className="w-8 h-8 mb-2" />
              <p className="font-primary text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-1" data-testid="ip-results">
              {/* Status */}
              <div className="data-row">
                <span className="data-label">Status</span>
                <span className={`data-value flex items-center gap-2 ${result.success ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                  {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {result.success ? "LOCATED" : "NOT FOUND"}
                </span>
              </div>

              {/* IP Address */}
              <div className="data-row">
                <span className="data-label">IP Address</span>
                <span className="data-value">{result.ip_address}</span>
              </div>

              {result.success && result.location && (
                <>
                  {/* Country */}
                  <div className="data-row">
                    <span className="data-label">Country</span>
                    <span className="data-value flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {result.location.country} ({result.location.country_code})
                    </span>
                  </div>

                  {/* Region */}
                  {result.location.region_name && (
                    <div className="data-row">
                      <span className="data-label">Region</span>
                      <span className="data-value">{result.location.region_name}</span>
                    </div>
                  )}

                  {/* City */}
                  {result.location.city && (
                    <div className="data-row">
                      <span className="data-label">City</span>
                      <span className="data-value flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {result.location.city}
                      </span>
                    </div>
                  )}

                  {/* Zip Code */}
                  {result.location.zip_code && (
                    <div className="data-row">
                      <span className="data-label">Postal Code</span>
                      <span className="data-value">{result.location.zip_code}</span>
                    </div>
                  )}

                  {/* Timezone */}
                  {result.location.timezone && (
                    <div className="data-row">
                      <span className="data-label">Timezone</span>
                      <span className="data-value flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {result.location.timezone}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* ISP */}
              {result.isp && (
                <div className="data-row">
                  <span className="data-label">ISP</span>
                  <span className="data-value flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    {result.isp}
                  </span>
                </div>
              )}

              {/* Organization */}
              {result.org && (
                <div className="data-row">
                  <span className="data-label">Organization</span>
                  <span className="data-value flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {result.org}
                  </span>
                </div>
              )}

              {/* AS Info */}
              {result.as_info && (
                <div className="data-row">
                  <span className="data-label">AS Number</span>
                  <span className="data-value flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    {result.as_info}
                  </span>
                </div>
              )}

              {/* Security Indicators */}
              <div className="mt-4 pt-4 border-t border-[#222222]">
                <span className="font-primary text-xs text-[#888888] uppercase tracking-wider mb-3 block">
                  Security Indicators
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.is_proxy && (
                    <span className="badge-danger px-2 py-1 text-xs font-primary uppercase flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Proxy
                    </span>
                  )}
                  {result.is_hosting && (
                    <span className="badge-warning px-2 py-1 text-xs font-primary uppercase flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      Hosting
                    </span>
                  )}
                  {result.is_mobile && (
                    <span className="badge-success px-2 py-1 text-xs font-primary uppercase flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      Mobile
                    </span>
                  )}
                  {!result.is_proxy && !result.is_hosting && !result.is_mobile && (
                    <span className="badge-success px-2 py-1 text-xs font-primary uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Clean
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
