'use client'

import { useState } from 'react'

interface AgentAvatarProps {
  name: string
  agentId?: string      // openclaw agent id (e.g. "main", "ash")
  avatarPath?: string   // relative path like "avatars/Bella.jpg"
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function getAvatarColors(name: string): { backgroundColor: string; color: string } {
  const hash = hashString(name.toLowerCase())
  const hue = hash % 360
  return {
    backgroundColor: `hsl(${hue} 70% 38%)`,
    color: 'hsl(0 0% 98%)',
  }
}

const sizeClasses: Record<NonNullable<AgentAvatarProps['size']>, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-16 h-16 text-lg',
}

export function AgentAvatar({ name, agentId, avatarPath, size = 'sm', className = '' }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const colors = getAvatarColors(name)
  const sizeClass = sizeClasses[size] || sizeClasses.sm

  const imgSrc = avatarPath && agentId && !imgError
    ? `/api/agents/avatar?agent=${encodeURIComponent(agentId)}&path=${encodeURIComponent(avatarPath)}`
    : null

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        title={name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 ${sizeClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${sizeClass} ${className}`}
      style={colors}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
