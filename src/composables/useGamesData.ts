/**
 * Composable для загрузки данных игр из JSON
 *
 * Инкапсулирует логику загрузки, валидации и обработки данных из games-data.json
 */

import type { Game, GamesData } from '../types/game'

/**
 * Валидирует структуру загруженного JSON
 */
function validateGamesData(data: any): data is GamesData {
  if (!data || typeof data !== 'object') {
    console.error('Invalid data: not an object')
    return false
  }

  if (typeof data.version !== 'string') {
    console.error('Invalid data: version is not a string')
    return false
  }

  if (typeof data.lastUpdated !== 'string') {
    console.error('Invalid data: lastUpdated is not a string')
    return false
  }

  if (!Array.isArray(data.games)) {
    console.error('Invalid data: games is not an array')
    return false
  }

  // Валидируем первые несколько игр для проверки структуры
  const samplesToCheck = Math.min(3, data.games.length)
  for (let i = 0; i < samplesToCheck; i++) {
    const game = data.games[i]

    if (!game.name || typeof game.name !== 'string') {
      console.error(`Invalid game at index ${i}: missing or invalid name`)
      return false
    }

    if (!game.src || typeof game.src !== 'string') {
      console.error(`Invalid game at index ${i}: missing or invalid src`)
      return false
    }

    if (!game.regions || typeof game.regions !== 'object') {
      console.error(`Invalid game at index ${i}: missing or invalid regions`)
      return false
    }
  }

  return true
}

/**
 * Применяет дефолты для опциональных полей
 */
function applyDefaults(games: Game[]): Game[] {
  return games.map(game => ({
    ...game,
    // Применяем дефолты для опциональных полей
    supportedCurrencies: {
      au: game.supportedCurrencies?.au ?? 'all',
      global: game.supportedCurrencies?.global ?? 'all',
    },
    no_demo: game.no_demo ?? false,
    dont_hide: game.dont_hide ?? false,
    // external_link остается как есть (undefined если нет)
    external_link: game.external_link,
  }))
}

/**
 * Загружает данные игр из JSON файла
 *
 * @param url - URL для загрузки (по умолчанию локальный файл)
 * @returns Promise с массивом игр
 * @throws Error если загрузка или валидация не удалась
 */
export async function useGamesData(url: string = '/games-data.json'): Promise<Game[]> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Валидируем структуру
    if (!validateGamesData(data)) {
      throw new Error('Invalid games data structure')
    }

    // Применяем дефолты для опциональных полей
    const gamesWithDefaults = applyDefaults(data.games)

    return gamesWithDefaults
  } catch (error) {
    console.error('Failed to load games data:', error)
    throw new Error(
      `Failed to load games data: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
