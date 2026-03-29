/**
 * Pokémon HQ Plugin
 * Sev's Pokémon collection dashboard — sealed, slabs, vintage, and singles.
 */

import { registerPanel, registerNavItems } from '@/lib/plugins'
import { PokemonPanel } from '@/components/panels/pokemon-panel'

export function initPokemonPlugin(): void {
  registerPanel('pokemon', PokemonPanel)

  registerNavItems([
    {
      id: 'pokemon',
      label: 'Pokémon HQ',
      icon: '/icons/pikachu.png',
      groupId: 'core',
    },
  ])
}
