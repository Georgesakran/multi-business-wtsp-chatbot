import React, { useEffect, useRef, useState } from "react";
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
import "./ChatTimeDistribution.css"; // Assuming you have some styles for the chart

import annotationPlugin from "chartjs-plugin-annotation";
ChartJS.register(annotationPlugin);
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const ChatTimeDistribution = ({ timeData = {} }) => {
  const chartRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const labels = ["Night", "Morning", "Afternoon", "Evening"];
  const rawData = [
    timeData.Night || 0,
    timeData.Morning || 0,
    timeData.Afternoon || 0,
    timeData.Evening || 0,
  ];

  const total = rawData.reduce((a, b) => a + b, 0);

  const getGradient = (ctx, color1, color2) => {
    const gradient = ctx.createLinearGradient(0, 0, isMobile ? 0 : 400, isMobile ? 400 : 0);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Messages",
        data: rawData,
        backgroundColor: (context) => {
          const chart = chartRef.current;
          const ctx = chart?.ctx;
          if (!ctx) return "#888";
          const colors = [
            ["#8e24aa", "#ba68c8"],
            ["#42a5f5", "#90caf9"],
            ["#ffb300", "#ffe082"],
            ["#ef5350", "#ef9a9a"],
          ];
          return getGradient(ctx, ...colors[context.dataIndex]);
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
        text: "🕒 Chat Time Distribution",
        font: { size: 20 },
        color: "#333",
        padding: { bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed[isMobile ? "x" : "y"];
            const percent = total ? Math.round((val / total) * 100) : 0;
            return `${val} messages (${percent}%)`;
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
    animation: {
      duration: 800,
    },
  };


  return (
    <div className="ChatTime-bar-card">
        <Bar ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default ChatTimeDistribution;