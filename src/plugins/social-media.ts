/**
 * Social Media Saves Plugin
 * Bella saves Instagram/Facebook/TikTok links here, organized by category.
 */

import { registerPanel, registerNavItems } from '@/lib/plugins'
import { SocialMediaPanel } from '@/components/panels/social-media-panel'

export function initSocialMediaPlugin(): void {
  registerPanel('social-media', SocialMediaPanel)

  registerNavItems([
    {
      id: 'social-media',
      label: 'Social Media',
      icon: '📱',
      groupId: 'core',
    },
  ])
}
