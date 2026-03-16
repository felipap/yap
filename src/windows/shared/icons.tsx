import { BsFillCollectionFill } from 'react-icons/bs'
import {
  MdAccessTime,
  MdContentCopy,
  MdDelete,
  MdFavorite,
  MdFavoriteBorder,
  MdFolder,
  MdIosShare,
  MdMic,
  MdMovie,
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

export function MicrophoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-black/30 dark:text-gray-50/20"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

export function ShareIcon({ size = 16, className }: IconProps) {
  return <MdIosShare size={size} className={className} />
}

export function HeartIcon({
  size = 16,
  className,
  filled,
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return <MdFavorite size={size} className={className} />
  }
  return <MdFavoriteBorder size={size} className={className} />
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return <MdDelete size={size} className={className} />
}
