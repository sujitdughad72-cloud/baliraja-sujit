import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "काहीतरी चुकले आहे. कृपया पुन्हा प्रयत्न करा.";
      
      try {
        const errorMsg = this.state.error?.message || "";
        if (errorMsg.includes("Missing or insufficient permissions")) {
          errorMessage = "तुमच्याकडे ही कृती करण्याची परवानगी नाही.";
        } else if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota")) {
          errorMessage = "एआय सेवा सध्या व्यस्त आहे (Quota Exceeded). कृपया १ मिनिटानंतर पुन्हा प्रयत्न करा.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFBF2]">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-4 border-paithani-gold text-center">
            <span className="text-6xl block mb-4">⚠️</span>
            <h2 className="text-2xl font-bold text-paithani-maroon mb-4">ओहो! त्रुटी आली.</h2>
            <p className="text-slate-600 mb-8 font-medium">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 btn-saffron text-white rounded-xl font-bold shadow-lg"
            >
              पुन्हा लोड करा
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
