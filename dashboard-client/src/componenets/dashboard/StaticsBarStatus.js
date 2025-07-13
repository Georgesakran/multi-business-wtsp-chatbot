import React, { useState } from "react";
import "./StaticsBars.css";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend } from "chart.js";
Chart.register(ArcElement, ChartTooltip, Legend);

const StaticsBarStatus = ({ statusCounts = {}, total = 0 }) => {
  const [visibleTooltip, setVisibleTooltip] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [showDonut, setShowDonut] = useState(false);

  const toggleMinimize = () => setMinimized((prev) => !prev);
  const toggleDonut = () => setShowDonut((prev) => !prev);

  const getPercentage = (count) => {
    if (!total || count === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const handleShowTooltip = (key) => {
    setVisibleTooltip(key);
    setTimeout(() => {
      setVisibleTooltip(null);
    }, 2500);
  };

  const statuses = [
    { label: "Pending", key: "pending", color: "#ffa726" },
    { label: "Confirmed", key: "confirmed", color: "#66bb6a" },
    { label: "Cancelled", key: "cancelled", color: "#ef5350" },
  ];

  const chartData = {
    labels: statuses.map((s) => s.label),
    datasets: [
      {
        data: statuses.map((s) => statusCounts[s.key] || 0),
        backgroundColor: statuses.map((s) => s.color),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="statics-bars">
      <div className="statics-bars-header">
        <h4>Status Overview</h4>
        <div className="statics-bars-buttons">
          <button onClick={toggleMinimize}>
            {minimized ? "➕" : "➖"}
          </button>
          <button onClick={toggleDonut}>
          {showDonut ? "📊" : "🍩"}
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {showDonut ? (
            <div className="donut-container">
              <Doughnut data={chartData} width={200} height={200} />
            </div>
          ) : (
            statuses.map(({ label, key, color }) => {
              const count = statusCounts[key] || 0;
              const percentage = getPercentage(count);

              return (
                <div key={key} className="stats-bar-row">
                  <div className="label-percent-row">
                    <span className="stats-bar-label">{label}</span>
                    <span className="stats-bar-percent">{percentage}%</span>
                  </div>

                  <div className="stats-bar-with-icon">
                    <div className="stats-bar">
                      <div
                        className="stats-bar-fill"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                    <img
                      src="/images/icons8-i-50.png"
                      alt="info"
                      className="info-icon"
                      onClick={() => handleShowTooltip(key)}
                    />
                  </div>

                  {visibleTooltip === key && (
                    <div className="tooltip-box">
                      {label}: {count} of {total}
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

export default StaticsBarStatus;