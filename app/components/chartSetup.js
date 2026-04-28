"use client";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, ArcElement,
  RadialLinearScale, Filler, Tooltip, Legend,
  ScatterController, BubbleController, LineController,
  BarController, DoughnutController, PieController,
  RadarController, PolarAreaController, Title,
} from "chart.js";

let registered = false;
export function registerCharts() {
  if (registered) return;
  registered = true;
  ChartJS.register(
    CategoryScale, LinearScale, LogarithmicScale,
    PointElement, LineElement, BarElement, ArcElement,
    RadialLinearScale, Filler, Tooltip, Legend,
    ScatterController, BubbleController, LineController,
    BarController, DoughnutController, PieController,
    RadarController, PolarAreaController, Title
  );
}
registerCharts();
