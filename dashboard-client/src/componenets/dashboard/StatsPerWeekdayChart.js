import React, { useRef, useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import "./StatsPerWeekdayChart.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const StatsPerWeekdayChart = ({ title = "📆 Weekly Distribution", data }) => {
  const chartRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const values = dayLabels.map((_, i) => data?.[i] || 0);
  const total = values.reduce((sum, val) => sum + val, 0);

  const getGradient = (ctx, color1, color2) => {
    const gradient = ctx.createLinearGradient(0, 0, isMobile ? 0 : 400, isMobile ? 400 : 0);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  const chartData = {
    labels: dayLabels,
    datasets: [
      {
        label: title,
        data: values,
        backgroundColor: (context) => {
          const chart = chartRef.current;
          const ctx = chart?.ctx;
          if (!ctx) return "#ccc";
          const colors = [
            ["#42a5f5", "#90caf9"],
            ["#66bb6a", "#a5d6a7"],
            ["#ffb74d", "#ffe082"],
            ["#ec407a", "#f8bbd0"],
            ["#5c6bc0", "#9fa8da"],
            ["#26a69a", "#80cbc4"],
            ["#8d6e63", "#bcaaa4"],
          ];
          return getGradient(ctx, ...colors[context.dataIndex % colors.length]);
        },
        borderRadius: 20,
        barThickness: 20,
      },
    ],
  };

  const options = {
    indexAxis: isMobile ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: isMobile ? 10 : 20,
        bottom: isMobile ? 10 : 20,
        left: isMobile ? 10 : 50,
        right: isMobile ? 10 : 50,
      },

    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: title,
        font: { size: 20 },
        color: "#333",
        padding: { bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed[isMobile ? "x" : "y"];
            const percent = total ? Math.round((val / total) * 100) : 0;
            return `${val} entries (${percent}%)`;
          },
        },
      },
    },
    scales: isMobile
    ? {
        x: {
          beginAtZero: true,
          grid: { color: "#eee" },
          ticks: { color: "#555", font: { size: 12 } },
        },
        y: {
          grid: { color: "#eee" },
          ticks: {
            color: "#333",
            font: { size: 14 },
            padding: 10,
          },
          offset: true,
        },
      }
    : {
        y: {
          beginAtZero: true,
          grid: { color: "#eee" },
          ticks: { color: "#555", font: { size: 14 } },
        },
        x: {
          grid: { color: "#eee" },
          ticks: { color: "#555" },
        },
      },
  
    animation: { duration: 800 },
  };

  return (
    <div className="weekday-bar-card">
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default StatsPerWeekdayChart;
