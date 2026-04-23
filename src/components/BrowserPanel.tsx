import React, { type FC, useState, useRef, useEffect, useMemo } from "react";
import { GenomeHub } from "wuepgg";
import "wuepgg/style.css";
import type { Track } from "../store/trackStore";
import { buildBrowserTracks } from "../utils/browserTracks";

type BrowserPanelProps = {
  nightMode: boolean;
  selectedTracks: Track[];
  viewRegion: string;
  onViewRegionChange: (region: string) => void;
  setUseViewRegion: (region: string) => void;
};

const BrowserPanel: FC<BrowserPanelProps> = ({
  nightMode,
  selectedTracks,
  viewRegion,
  onViewRegionChange,
setUseViewRegion
}) => {
  // Generate a random storeId for each component instance
  const storeId = useMemo(() => {
    return `genome-browser`;
  }, []);

  console.log("I am passing this view region to the browser:", viewRegion);
  console.log("Store ID:", storeId);

  // Standard reference is always hg38 - other species use genome align tracks
  const activeReference = "hg38";

  // Build browser tracks with default tracks and genome align tracks for non-hg38 species
  const browserTracks = useMemo(() => {
    const tracks = buildBrowserTracks(selectedTracks);
    console.log("browserTracks:", tracks);
    return tracks;
  }, [selectedTracks]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNavBar, setShowNavBar] = useState(false);
  const browserContainerRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen function
  const toggleFullscreen = async () => {
    if (!browserContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await browserContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcut: F to toggle fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);


  const onSessionUpdate = React.useCallback(
    (currentViewRegion: any) => {
      if (currentViewRegion === null) {
        return;
      }


      if (!Object.keys(currentViewRegion).includes("userViewRegion")) {
        return;
      }
      if (currentViewRegion.userViewRegion !== null) {
        onViewRegionChange(currentViewRegion.userViewRegion);
      }
    },
    [onViewRegionChange, viewRegion],
  );
  // CHADS NOTE: stop recreating the objects on every render, when placing objects as props in component
  // don't need randomize storeid, just one same storeId is fine for this app
  const storeConfig = useMemo(() => ({ storeId }), [storeId]);

  // CHADS NOTE IMPORTANT!!: we want to capture the viewRegion data once and then pass it to the GenomeHub 
  // since BrowserPanel gets recreated on every tab change/ session change. capturing the viewRegion on BrowserPanel on
  // initialize will get the viewRegion data we left off from when leaving the browser tab and setting that viewRegion data
  // back when we switch back to the browser tab. 
  const viewRegionMemo = useMemo(
    () => (viewRegion ? { genomeCoordinate: viewRegion } : undefined),
    [],
  );

  return (
    <div
      className={`${isFullscreen ? "h-screen" : "h-full flex flex-col"} ${nightMode ? "text-gray-200" : "text-gray-800"}`}
      style={{ minHeight: 0 }}
    >
      {/* Browser Container */}
           {/* ${ nightMode ? "card-science-dark" : "card-science"} CHADS NOTE: these styles causes issues with hover alignment and hover*/}
      <div
        ref={browserContainerRef}
        className={`${isFullscreen ? "h-full rounded-none" : "rounded-2xl flex-1"} shadow-xl overflow-hidden flex flex-col ${isFullscreen ? "fullscreen-browser" : ""}`}
        style={!isFullscreen ? { minHeight: 0 } : {}}
      >
        {/* Browser Header */}
        <div
          className={`border-b flex items-center gap-3 ${
            nightMode
              ? "border-science-700 bg-science-800"
              : "border-science-200 bg-science-50"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
              nightMode
                ? "bg-science-700 border-science-600"
                : "bg-white border-science-200"
            } border`}
          >
            <img
              src="https://epgg.github.io/assets/images/eg-51ea8bd8d2ca299ede6ceb5f1c987ff7.png"
              alt="WashU Epigenome Browser"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1">
            <h3
              className={`text-lg font-semibold ${nightMode ? "text-white" : "text-science-900"}`}
            >
              WashU Epigenome Browser
            </h3>
            <p
              className={`text-sm ${nightMode ? "text-science-400" : "text-science-600"}`}
            >
              Interactive genomic data visualization
            </p>
          </div>
          {/* Nav Bar Toggle Button */}
          <button
            onClick={() => setShowNavBar(!showNavBar)}
            className={`p-2.5 rounded-lg transition-all ${
              nightMode
                ? showNavBar
                  ? "bg-science-600 hover:bg-science-500 text-science-100"
                  : "bg-science-700 hover:bg-science-600 text-science-200"
                : showNavBar
                  ? "bg-science-200 hover:bg-science-300 text-science-800"
                  : "bg-science-100 hover:bg-science-200 text-science-700"
            } hover:shadow-md`}
            title={showNavBar ? "Hide Navigation Bar" : "Show Navigation Bar"}
          >
            {showNavBar ? (
              // Close/X icon when nav bar is visible
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              // Hamburger menu icon when nav bar is hidden
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-lg transition-all ${
              nightMode
                ? "bg-science-700 hover:bg-science-600 text-science-200"
                : "bg-science-100 hover:bg-science-200 text-science-700"
            } hover:shadow-md`}
            title={
              isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen (F)"
            }
          >
            {isFullscreen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Browser Display */}
        <>
          {storeId} {viewRegion}
        </>
        <div
          className={`flex-1 flex flex-col ${isFullscreen ? "min-h-0" : "py-6"}`}
          style={{ minHeight: 0 }}
        >
          <div
            className={`flex-1 overflow-y-auto ${isFullscreen ? "" : ""}`}
            style={{ minHeight: 0 }}
          >
            <div className="relative bg-white w-full h-full">
              <GenomeHub
                storeConfig={storeConfig}
                viewRegion={viewRegionMemo}
                genomeName={activeReference}
                tracks={browserTracks}
                onSessionUpdate={onSessionUpdate}
                showGenomeNavigator={true}
                showNavBar={showNavBar}
                showToolBar={true}
                showDisclosure={false}
                   darkMode={nightMode}

              />
            </div>
          </div>
        </div>

        {/* Documentation Hint - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="p-6 pt-0 space-y-2">
            <div
              className={`p-3 rounded-lg ${
                nightMode
                  ? "bg-sky-500/10 border-sky-500/30"
                  : "bg-sky-50 border-sky-200"
              } border flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-5 h-5 ${nightMode ? "text-sky-400" : "text-sky-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  ></path>
                </svg>
                <p
                  className={`text-sm ${nightMode ? "text-science-300" : "text-science-700"}`}
                >
                  <strong>Need help?</strong> Check out the{" "}
                  <a
                    href="https://epgg.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${nightMode ? "text-sky-400 hover:text-sky-300" : "text-primary-600 hover:text-primary-700"} underline font-semibold`}
                  >
                    Browser Documentation
                  </a>
                </p>
              </div>
            </div>
            <div
              className={`p-2 rounded-lg ${
                nightMode
                  ? "bg-primary-500/10 border-primary-500/30"
                  : "bg-primary-50 border-primary-200"
              } border flex items-center gap-2`}
            >
              <svg
                className={`w-4 h-4 ${nightMode ? "text-primary-400" : "text-primary-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
              <p
                className={`text-xs ${nightMode ? "text-primary-300" : "text-primary-700"}`}
              >
                <strong>Quick Tip:</strong> Press{" "}
                <kbd
                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                    nightMode
                      ? "bg-primary-800 border-primary-600"
                      : "bg-primary-100 border-primary-300"
                  } border`}
                >
                  F
                </kbd>{" "}
                to toggle fullscreen or{" "}
                <kbd
                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                    nightMode
                      ? "bg-primary-800 border-primary-600"
                      : "bg-primary-100 border-primary-300"
                  } border`}
                >
                  ESC
                </kbd>{" "}
                to exit
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPanel;
