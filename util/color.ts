// Loosened from upstream's 99.9 / 99 / 95: bars cover about 2 hours, where one
// failed check is ~1%.
function getColor(percent: number | string, darker: boolean): string {
  percent = Number(percent)
  if (percent >= 99) {
    return darker ? '#059669' : '#3bd671'
  } else if (percent >= 90) {
    return darker ? '#3bd671' : '#9deab8'
  } else if (percent >= 50) {
    return '#f29030'
  } else if (Number.isNaN(percent)) {
    return 'gray'
  } else {
    return '#df484a'
  }
}

export { getColor }
