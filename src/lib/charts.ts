import { init, use } from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, LegendComponent, AriaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, AriaComponent, CanvasRenderer]);
export function createChart(element: HTMLElement) { return init(element); }
