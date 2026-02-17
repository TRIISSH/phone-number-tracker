import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  History,
  Phone,
  Globe,
  Clock,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LookupHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/history?limit=50`);
      setHistory(response.data);
    } catch (err) {
      setError("Failed to load lookup history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="lookup-history">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tool-card p-6 bracket-corners"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-[#00ff9d]" />
            <h2 className="font-secondary font-bold text-2xl text-white uppercase tracking-wider">
              Lookup History
            </h2>
          </div>
          
          <Button
            onClick={fetchHistory}
            disabled={loading}
            className="rounded-none border border-[#333333] bg-transparent text-[#888888] hover:border-[#00ff9d] hover:text-[#00ff9d] font-primary text-xs uppercase tracking-wider"
            data-testid="refresh-history-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <p className="font-primary text-sm text-[#888888]">
          View recent phone number and IP address lookups performed on this platform.
          History is stored locally for educational demonstration purposes.
        </p>
      </motion.div>

      {/* History List */}
      <div className="tool-card p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-[#00ff9d] animate-spin mb-4" />
            <p className="font-primary text-sm text-[#888888]">Loading history...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-48 text-[#ff0055]">
            <AlertTriangle className="w-8 h-8 mb-4" />
            <p className="font-primary text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-[#555555]">
            <History className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-primary text-sm">No lookup history yet</p>
            <p className="font-primary text-xs text-[#444444] mt-2">
              Perform a phone or IP lookup to see it here
            </p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="space-y-3">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="history-item flex items-center gap-4"
                data-testid={`history-item-${item.id}`}
              >
                {/* Type Icon */}
                <div className={`p-2 ${item.lookup_type === 'phone' ? 'bg-[#00ff9d10] border border-[#00ff9d30]' : 'bg-[#00d2ff10] border border-[#00d2ff30]'}`}>
                  {item.lookup_type === 'phone' ? (
                    <Phone className="w-4 h-4 text-[#00ff9d]" />
                  ) : (
                    <Globe className="w-4 h-4 text-[#00d2ff]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-primary text-xs uppercase tracking-wider ${item.lookup_type === 'phone' ? 'text-[#00ff9d]' : 'text-[#00d2ff]'}`}>
                      {item.lookup_type}
                    </span>
                    <span className="font-primary text-sm text-white truncate">
                      {item.query}
                    </span>
                  </div>
                  <p className="font-primary text-xs text-[#666666] truncate">
                    {item.result_summary}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[#555555]">
                  <Clock className="w-3 h-3" />
                  <span className="font-primary text-xs whitespace-nowrap">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && !error && history.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#222222] flex flex-wrap gap-6">
            <div>
              <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
                Total Lookups
              </span>
              <p className="font-secondary font-bold text-2xl text-[#00ff9d]">
                {history.length}
              </p>
            </div>
            <div>
              <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
                Phone Lookups
              </span>
              <p className="font-secondary font-bold text-2xl text-[#00ff9d]">
                {history.filter(h => h.lookup_type === 'phone').length}
              </p>
            </div>
            <div>
              <span className="font-primary text-xs text-[#555555] uppercase tracking-wider">
                IP Lookups
              </span>
              <p className="font-secondary font-bold text-2xl text-[#00d2ff]">
                {history.filter(h => h.lookup_type === 'ip').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
