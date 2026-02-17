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
  Clock,
  Crosshair,
  Map,
  Target
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
  const [loadingMyIP, setLoadingMyIP] = useState(true);

  useEffect(() => {
    // Fetch the current IP on load
    const fetchMyIP = async () => {
      try {
        const response = await axios.get(`${API}/ip/me`);
        if (response.data.success) {
          setMyIP(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch IP");
      } finally {
        setLoadingMyIP(false);
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
        toast.success(`Located: ${response.data.location?.city}, ${response.data.location?.country}`);
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

  const handleTrackMyIP = async () => {
    if (myIP && myIP.ip_address) {
      setIpAddress(myIP.ip_address);
      setResult(myIP);
      toast.success(`Your IP located: ${myIP.location?.city}, ${myIP.location?.country}`);
    }
  };

  // Calculate marker position on the map
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
            <Globe className="w-5 h-5 text-[#00ff9d]" />
            <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
              IP Location Tracker
            </h2>
          </div>

          <p className="font-primary text-sm text-[#888888] mb-6">
            Track any IP address to get <span className="text-[#00ff9d]">exact city location</span>, 
            ISP details, coordinates, and security indicators (VPN/Proxy detection).
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
                placeholder="Enter IP (e.g., 8.8.8.8)"
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
                  <Target className="w-4 h-4 mr-2" />
                  Track IP Location
                </>
              )}
            </Button>
          </form>

          {/* Track My IP Button */}
          <div className="mt-4">
            <Button
              onClick={handleTrackMyIP}
              disabled={loadingMyIP || !myIP}
              className="w-full h-10 rounded-none border border-[#00d2ff] bg-transparent text-[#00d2ff] hover:bg-[#00d2ff] hover:text-black font-secondary font-bold uppercase tracking-widest text-xs transition-colors duration-200"
              data-testid="track-my-ip-btn"
            >
              <Crosshair className="w-4 h-4 mr-2" />
              {loadingMyIP ? "Detecting..." : "Track My Current IP"}
            </Button>
          </div>

          {/* Sample IPs */}
          <div className="mt-6 pt-6 border-t border-[#222222]">
            <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
              Try sample IPs:
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {["8.8.8.8", "1.1.1.1", "208.67.222.222", "103.102.166.224"].map((ip) => (
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

          {/* Current IP Info */}
          {myIP && myIP.success && (
            <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#333333]">
              <div className="font-primary text-xs text-[#555555] uppercase tracking-wider mb-2">
                Your Current IP
              </div>
              <div className="flex items-center justify-between">
                <span className="font-primary text-sm text-[#00d2ff]">{myIP.ip_address}</span>
                <span className="font-primary text-xs text-[#888888]">
                  {myIP.location?.city}, {myIP.location?.country_code}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Map Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Map Visualization */}
          <div className="map-placeholder h-80 relative rounded-none overflow-hidden" data-testid="ip-map">
            <div className="map-grid" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              {!result && !loading && (
                <div className="text-[#333333] font-primary text-sm text-center">
                  <Map className="w-16 h-16 mx-auto mb-2 opacity-20" />
                  <span>Enter an IP address to locate</span>
                </div>
              )}
              
              {loading && (
                <div className="text-[#00ff9d] text-center">
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
            {result && result.success && result.location && (
              <div className="absolute bottom-4 left-4 bg-black/90 p-4 border border-[#00ff9d]">
                <div className="font-primary text-xs text-[#888888] uppercase mb-1">Exact Location</div>
                <div className="font-primary text-lg text-[#00ff9d] font-bold">
                  {result.location.city}, {result.location.country_code}
                </div>
                <div className="font-primary text-sm text-[#00d2ff] mt-1">
                  {result.location.latitude.toFixed(4)}°, {result.location.longitude.toFixed(4)}°
                </div>
              </div>
            )}

            {/* Country indicator */}
            {result && result.success && result.location && (
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
          {result && result.success && result.location && (
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
        className={`result-panel p-6 ${result ? (result.success ? 'success' : 'error') : ''}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-[#00d2ff]" />
          <h2 className="font-secondary font-bold text-xl text-white uppercase tracking-wider">
            Location Details
          </h2>
        </div>

        {!result && !error && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-[#555555]">
            <Navigation className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-primary text-sm">Enter an IP address to get exact location</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-32">
            <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
            <p className="font-primary text-sm text-[#00ff9d] mt-4">Querying geolocation databases...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-32 text-[#ff0055]">
            <XCircle className="w-12 h-12 mb-4" />
            <p className="font-primary text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="ip-results">
            {/* Status */}
            <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
              <span className="data-label block mb-1">Status</span>
              <span className={`data-value flex items-center gap-2 text-lg ${result.success ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                {result.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {result.success ? "LOCATED" : "NOT FOUND"}
              </span>
            </div>

            {/* IP Address */}
            <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
              <span className="data-label block mb-1">IP Address</span>
              <span className="data-value text-lg">{result.ip_address}</span>
            </div>

            {result.success && result.location && (
              <>
                {/* Country */}
                <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                  <span className="data-label block mb-1">Country</span>
                  <span className="data-value flex items-center gap-2 text-lg">
                    <Globe className="w-5 h-5" />
                    {result.location.country} ({result.location.country_code})
                  </span>
                </div>

                {/* Region */}
                {result.location.region_name && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                    <span className="data-label block mb-1">Region/State</span>
                    <span className="data-value text-lg">{result.location.region_name}</span>
                  </div>
                )}

                {/* City - Highlighted */}
                {result.location.city && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#00ff9d]">
                    <span className="data-label block mb-1">City (Exact)</span>
                    <span className="data-value flex items-center gap-2 text-xl text-[#00ff9d]">
                      <MapPin className="w-5 h-5" />
                      {result.location.city}
                    </span>
                  </div>
                )}

                {/* Postal Code */}
                {result.location.zip_code && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                    <span className="data-label block mb-1">Postal/ZIP Code</span>
                    <span className="data-value text-lg">{result.location.zip_code}</span>
                  </div>
                )}

                {/* GPS Coordinates */}
                <div className="data-row bg-[#0a0a0a] p-4 border border-[#00d2ff] col-span-full md:col-span-2">
                  <span className="data-label block mb-1">GPS Coordinates</span>
                  <span className="data-value flex items-center gap-2 text-xl text-[#00d2ff]">
                    <Navigation className="w-5 h-5" />
                    {result.location.latitude.toFixed(4)}°, {result.location.longitude.toFixed(4)}°
                  </span>
                </div>

                {/* Timezone */}
                {result.location.timezone && (
                  <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                    <span className="data-label block mb-1">Timezone</span>
                    <span className="data-value flex items-center gap-2 text-lg">
                      <Clock className="w-5 h-5" />
                      {result.location.timezone}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ISP */}
            {result.isp && (
              <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                <span className="data-label block mb-1">ISP</span>
                <span className="data-value flex items-center gap-2 text-lg">
                  <Wifi className="w-5 h-5" />
                  {result.isp}
                </span>
              </div>
            )}

            {/* Organization */}
            {result.org && (
              <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                <span className="data-label block mb-1">Organization</span>
                <span className="data-value flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  {result.org}
                </span>
              </div>
            )}

            {/* AS Info */}
            {result.as_info && (
              <div className="data-row bg-[#0a0a0a] p-4 border border-[#222222]">
                <span className="data-label block mb-1">AS Number</span>
                <span className="data-value flex items-center gap-2 text-sm">
                  <Server className="w-5 h-5" />
                  {result.as_info}
                </span>
              </div>
            )}

            {/* Security Indicators */}
            <div className="col-span-full mt-4 pt-4 border-t border-[#222222]">
              <span className="font-primary text-xs text-[#888888] uppercase tracking-wider mb-3 block">
                Security Analysis
              </span>
              <div className="flex flex-wrap gap-3">
                {result.is_proxy && (
                  <span className="badge-danger px-3 py-2 text-xs font-primary uppercase flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Proxy Detected
                  </span>
                )}
                {result.is_hosting && (
                  <span className="badge-warning px-3 py-2 text-xs font-primary uppercase flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Hosting/Datacenter
                  </span>
                )}
                {result.is_mobile && (
                  <span className="badge-success px-3 py-2 text-xs font-primary uppercase flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Mobile Network
                  </span>
                )}
                {!result.is_proxy && !result.is_hosting && !result.is_mobile && (
                  <span className="badge-success px-3 py-2 text-xs font-primary uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Clean Residential IP
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
