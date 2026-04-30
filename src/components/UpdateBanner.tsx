import React from "react";
import { useAppContext } from "../context/AppContext";

const UpdateBanner: React.FC = () => {
  const { updateAvailable, dismissUpdateNotification } = useAppContext();

  if (!updateAvailable) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg border-b-2 border-blue-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <p className="font-bold text-sm">Update Available</p>
              <p className="text-xs text-blue-100">A new version of the app is ready. Refresh to get the latest features and improvements.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="bg-white text-blue-600 font-bold px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm shadow-sm hover:shadow-md"
            >
              Refresh Now
            </button>
            <button
              onClick={dismissUpdateNotification}
              className="text-blue-200 hover:text-white text-2xl leading-none transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UpdateBanner;
