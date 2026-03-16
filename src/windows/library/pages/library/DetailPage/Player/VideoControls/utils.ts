export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getBufferedPercent(
  bufferedRanges: TimeRanges | null,
  currentTime: number,
  duration: number,
): number {
  if (!bufferedRanges || bufferedRanges.length === 0 || !duration) {
    return 0
  }

  for (let i = 0; i < bufferedRanges.length; i++) {
    if (
      bufferedRanges.start(i) <= currentTime &&
      currentTime <= bufferedRanges.end(i)
    ) {
      return (bufferedRanges.end(i) / duration) * 100
    }
  }

  return (bufferedRanges.end(bufferedRanges.length - 1) / duration) * 100
}
