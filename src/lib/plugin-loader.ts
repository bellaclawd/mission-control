/**
 * Plugin Loader
 *
 * Simple explicit loader following the initPro() pattern.
 * Plugins register via direct import + init() call.
 *
 * Dynamic MC_PLUGINS env-based loading can be added later.
 */

import { initPokemonPlugin } from '@/plugins/pokemon'
import { initSocialMediaPlugin } from '@/plugins/social-media'

export function loadPlugins(): void {
  initPokemonPlugin()
  initSocialMediaPlugin()
}
