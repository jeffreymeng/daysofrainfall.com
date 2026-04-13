"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { CityData, CITY_COLORS } from "@/lib/weather";

const MONTH_STARTS = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RainfallChartProps {
  cities: CityData[];
}

export default function RainfallChart({ cities }: RainfallChartProps) {
  const labels = Array.from({ length: 366 }, (_, i) => i);
  const isSingleCity = cities.length === 1;

  let data: ChartData<"line">;

  if (isSingleCity) {
    const city = cities[0];
    data = {
      labels,
      datasets: [
        {
          label: "Snow",
          data: city.snowProbabilities,
          borderColor: "rgb(148, 163, 184)",
          backgroundColor: "rgba(148, 163, 184, 0.4)",
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
          fill: true,
          order: 3,
        },
        {
          label: "Rain",
          data: city.snowProbabilities.map((s, i) => s + city.rainProbabilities[i]),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.35)",
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
          fill: true,
          order: 2,
        },
        {
          label: "Other",
          data: city.rainfallProbabilities,
          borderColor: "rgba(59, 130, 246, 0.5)",
          backgroundColor: "rgba(100, 116, 139, 0.2)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
          fill: true,
          order: 1,
        },
      ],
    };
  } else {
    data = {
      labels,
      datasets: cities.map((city, i) => ({
        label: city.displayName,
        data: city.rainfallProbabilities,
        borderColor: CITY_COLORS[i % CITY_COLORS.length],
        backgroundColor: CITY_COLORS[i % CITY_COLORS.length]
          .replace("rgb", "rgba")
          .replace(")", ", 0.1)"),
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 10,
        tension: 0.4,
        fill: false,
      })),
    };
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: isSingleCity,
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          font: { size: 12, family: "'Inter', system-ui, sans-serif" },
          color: "#94a3b8",
          filter: (item) => {
            // Hide "Other" from legend if it's negligible
            if (item.text === "Other") {
              const city = cities[0];
              const maxOther = Math.max(...city.otherProbabilities);
              return maxOther > 1;
            }
            // Hide "Snow" if negligible
            if (item.text === "Snow") {
              const city = cities[0];
              const maxSnow = Math.max(...city.snowProbabilities);
              return maxSnow > 1;
            }
            return true;
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1e293b",
        bodyColor: "#475569",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 13, family: "'Inter', system-ui, sans-serif" },
        bodyFont: { size: 12, family: "'Inter', system-ui, sans-serif" },
        displayColors: true,
        filter: (item) => {
          if (!isSingleCity) return true;
          const city = cities[0];
          const idx = item.dataIndex;
          if (item.dataset.label === "Snow" && city.snowProbabilities[idx] < 0.5) return false;
          if (item.dataset.label === "Other" && city.otherProbabilities[idx] < 0.5) return false;
          return true;
        },
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex;
            const date = new Date(2024, 0, idx + 1);
            return date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            });
          },
          label: (item) => {
            if (isSingleCity) {
              const city = cities[0];
              const idx = item.dataIndex;
              if (item.dataset.label === "Rain") {
                return ` Rain: ${city.rainProbabilities[idx].toFixed(1)}%`;
              } else if (item.dataset.label === "Snow") {
                return ` Snow: ${city.snowProbabilities[idx].toFixed(1)}%`;
              } else {
                return ` Total: ${city.rainfallProbabilities[idx].toFixed(1)}%`;
              }
            }
            return ` ${item.dataset.label}: ${(item.raw as number).toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 12, family: "'Inter', system-ui, sans-serif" },
          color: "#94a3b8",
          maxRotation: 0,
          callback: (value) => {
            const idx = value as number;
            const monthIdx = MONTH_STARTS.indexOf(idx);
            return monthIdx >= 0 ? MONTH_NAMES[monthIdx] : "";
          },
          autoSkip: false,
          maxTicksLimit: 12,
        },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
          font: { size: 12, family: "'Inter', system-ui, sans-serif" },
          color: "#94a3b8",
          stepSize: 20,
        },
        grid: {
          color: "#f1f5f9",
        },
        border: { display: false },
      },
    },
  };

  if (cities.length === 0) return null;

  return (
    <div className="absolute inset-0">
      <div className="h-full w-full p-4 pt-32 pb-10 sm:p-8 sm:pt-32 sm:pb-12">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
