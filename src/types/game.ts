/**
 * Типы данных для игр
 */

/**
 * Региональные данные игры
 */
export interface GameRegion {
  game_slug: string
  provider: string
  provider_slug: string
}

/**
 * Интерфейс игры из JSON (формат админки и плеера)
 */
export interface Game {
  name: string
  regions: {
    au?: GameRegion
    global?: GameRegion
  }
  src: string
  supportedCurrencies: {
    au?: string[] | 'all'
    global?: string[] | 'all'
  }
  no_demo?: boolean
  external_link?: {
    url: string
    localeKey: string
  }
  dont_hide?: boolean
}

/**
 * Структура JSON файла games-data.json (формат админки)
 */
export interface GamesData {
  version: string
  lastUpdated: string
  games: Game[]
}
