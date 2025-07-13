import React, { useState } from "react";
import "./StaticsBars.css";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend } from "chart.js";
Chart.register(ArcElement, ChartTooltip, Legend);

const sourceIcons = {
  manual: "🖐️",
  chatbot: "🤖",
};

const StaticsBySource = ({ sourceCounts = {}, total = 0 }) => {
  const [visibleTooltip, setVisibleTooltip] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [showDonut, setShowDonut] = useState(false);

  const toggleMinimize = () => setMinimized((prev) => !prev);
  const toggleDonut = () => setShowDonut((prev) => !prev);

  const getPercentage = (count) => {
    if (!total || count === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const sources = Object.keys(sourceCounts).length
    ? Object.entries(sourceCounts)
    : [["manual", 0]];

  const chartData = {
    labels: sources.map(([key]) => key.charAt(0).toUpperCase() + key.slice(1)),
    datasets: [
      {
        data: sources.map(([_, count]) => count),
        backgroundColor: sources.map(([key]) =>
          key === "chatbot" ? "#42a5f5" : "#ab47bc"
        ),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="statics-bars">
      <div className="statics-bars-header">
        <h4>Source Overview</h4>
        <div className="statics-bars-buttons">
          <button onClick={toggleMinimize}>
            {minimized ? "➕" : "➖"}
          </button>
          <button onClick={toggleDonut}>🍩</button>
        </div>
      </div>

      {!minimized && (
        <>
          {showDonut ? (
            <div className="donut-container">
              <Doughnut data={chartData} width={200} height={200} />
            </div>
          ) : (
            sources.map(([key, count]) => {
              const percent = getPercentage(count);
              const icon = sourceIcons[key] || "📌";
              const barColor = key === "chatbot" ? "#42a5f5" : "#ab47bc";
              const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);

              return (
                <div key={key} className="stats-bar-row">
                  <div className="label-percent-row">
                    <span className="stats-bar-label">{icon} {capitalKey}</span>
                    <span className="stats-bar-percent">{percent}%</span>
                  </div>
                  <div className="stats-bar-with-icon">
                    <div className="stats-bar">
                      <div
                        className="stats-bar-fill"
                        style={{ width: `${percent}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <img
                      src="/images/icons8-i-50.png"
                      alt="info"
                      className="info-icon"
                      onClick={() => {
                        setVisibleTooltip(key);
                        setTimeout(() => setVisibleTooltip(null), 2500);
                      }}
                    />
                  </div>

                  {visibleTooltip === key && (
                    <div className="tooltip-box">
                      {capitalKey}: {count} of {total}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

export default StaticsBySource;