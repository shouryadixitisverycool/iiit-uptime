import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'IIIT Uptime',
  links: [{ link: 'https://github.com/shouryadixitisverycool/iiit-uptime', label: 'GitHub' }],
}

const http = (id: string, name: string, url: string, tooltip: string) => ({
  id,
  name,
  method: 'GET',
  target: url,
  statusPageLink: url,
  tooltip,
  hideLatencyChart: false,
  timeout: 48000,
})

const workerConfig: WorkerConfig = {
  monitors: [
    http('moodle', 'Moodle', 'https://courses.iiit.ac.in/', 'Course pages, assignments and submissions'),
    http('ims', 'IMS', 'https://ims.iiit.ac.in/', 'Grades, registration and academic records'),
    http('dining', 'Dining', 'https://dining.iiit.ac.in/', 'Mess registration and menus'),
    http('intranet', 'Intranet', 'https://intranet.iiit.ac.in/', 'Campus intranet'),
    http('matrix', 'Matrix', 'https://matrix.iiit.ac.in/', 'Matrix chat server'),
    // Kuma push monitor: the D Block router sends heartbeats, so there is no URL to check.
    // It also runs an hourly speed test, which MonitorDetail charts from speed.json.
    {
      id: 'dblock',
      name: 'D Block LAN',
      method: 'GET',
      target: '',
      tooltip: 'Heartbeat and hourly speed test from a router on the D Block network',
      hideLatencyChart: true,
    },
  ],
}

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
