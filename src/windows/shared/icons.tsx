import { BsFillCollectionFill } from 'react-icons/bs'
import {
  MdAccessTime,
  MdContentCopy,
  MdFolder,
  MdMic,
  MdMovie,
  MdMovieFilter,
  MdRefresh,
  MdSearch,
  MdVideocam,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md'

interface IconProps extends React.HTMLAttributes<SVGSVGElement> {
  size?: number
  className?: string
}

export function SolidSquare({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="16" height="16" fill="currentColor" />
    </svg>
  )
}

export function MovieIcon({ size = 16, className }: IconProps) {
  return <MdMovie size={size} className={className} />
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return <MdSearch size={size} className={className} />
}

export function VideocamIcon({ size = 16, className }: IconProps) {
  return <MdVideocam size={size} className={className} />
}

export function MicIcon({ size = 16, className }: IconProps) {
  return <MdMic size={size} className={className} />
}

export function FolderIcon({ size = 16, className, ...props }: IconProps) {
  return <MdFolder size={size} className={className} {...props} />
}

export function LibraryIcon({ size = 16, className }: IconProps) {
  return <BsFillCollectionFill size={size} className={className} />
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return <MdAccessTime size={size} className={className} />
}

export function RefreshIcon({ size = 16, className }: IconProps) {
  return <MdRefresh size={size} className={className} />
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return <MdContentCopy size={size} className={className} />
}

export function RecordIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="8" cy="8" r="6" fill="currentColor" />
    </svg>
  )
}

export function VisibilityIcon({ size = 16, className }: IconProps) {
  return <MdVisibility size={size} className={className} />
}

export function VisibilityOffIcon({ size = 16, className }: IconProps) {
  return <MdVisibilityOff size={size} className={className} />
}
