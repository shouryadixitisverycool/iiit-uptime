import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-moment'
import { Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
const moment = require('moment')

ChartJS.register(LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, TimeScale)

// [unix time, download Mbps, upload Mbps, latency ms], from kuma/kuma_to_state.py
export type SpeedPoint = [number, number, number, number]

export default function SpeedChart({ speed }: { speed: SpeedPoint[] }) {
  const { t } = useTranslation('common')
  if (speed.length === 0) return null

  const [time, down, up, latency] = speed[speed.length - 1]
  const line = (label: string, color: string, i: 1 | 2) => ({
    label,
    data: speed.map((p) => ({ x: p[0] * 1000, y: p[i] })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    radius: speed.length > 1 ? 0 : 3,
    cubicInterpolationMode: 'monotone' as const,
    tension: 0.4,
  })

  const data = {
    datasets: [
      line(t('Download'), 'rgb(37, 99, 235)', 1),
      line(t('Upload'), 'rgb(234, 88, 12)', 2),
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    animation: { duration: 0 },
    plugins: {
      tooltip: {
        callbacks: { label: (item: any) => `${item.dataset.label}: ${item.parsed.y} Mbps` },
      },
      legend: { display: true, position: 'top' as const, align: 'end' as const },
      title: { display: true, text: t('Speed'), align: 'start' as const },
    },
    scales: {
      x: { type: 'time' as const, ticks: { source: 'auto' as const, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true },
    },
  }

  return (
    <>
      <Text mt="xs" size="sm" c="dimmed">
        {t('Latest speed', {
          down,
          up,
          latency: Math.round(latency),
          ago: moment(time * 1000).fromNow(),
        })}
      </Text>
      <div style={{ height: '150px' }}>
        <Line options={options} data={data} />
      </div>
    </>
  )
}
