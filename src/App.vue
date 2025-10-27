<template>
  <div class="desktop_wrapper">
    <div id="video_area" class="video_area">
      <div ref="videos_container" class="videos_container">
        <!-- [DP-11241][P0] Верхний спейсер: сохраняет общую высоту документа при windowed rendering -->
        <div :style="{ height: topSpacerHeight + 'px' }"></div>

        <div
          v-for="(game, index) in visibleGames"
          :key="game.game_slug"
          :id="game.game_slug"
          class="video_screen"
          :class="{
            'autoplay-blocked': autoplayBlocked && currentVideoIndex === renderWindow.start + index,
          }"
        >
          <img
            :src="getPosterPath(game.src)"
            v-if="shouldLoadMedia(renderWindow.start + index) && game.game_slug !== 'final_popup'"
            class="poster"
            alt="poster"
          />

          <video
            v-if="game.game_slug !== 'final_popup'"
            class="video_screen_item"
            :preload="shouldLoadSources(renderWindow.start + index) ? 'metadata' : 'none'"
            muted
            loop
            playsinline
            webkit-playsinline
            :poster="shouldLoadMedia(renderWindow.start + index) ? getPosterPath(game.src) : ''"
            :ref="(el) => setVideoRef(el as HTMLVideoElement, renderWindow.start + index)"
          >
            <source
              v-if="shouldLoadSources(renderWindow.start + index)"
              :src="`/video/webm/${game.src}.webm?3`"
              type="video/webm"
            />
            <source
              v-if="shouldLoadSources(renderWindow.start + index)"
              :src="`/video/h264/${game.src}.mp4?3`"
              type="video/mp4"
            />
          </video>
          <FinalPopup
            v-if="game.game_slug === 'final_popup'"
            :title="$t('final_popup_title')"
            :subtitle="$t('final_popup_subtitle')"
            :button-text="$t('final_popup_button')"
            :evaluation-title="$t('final_popup_evaluation')"
            @rewatch-trends="rewatchTrends"
          />

          <transition name="fade">
            <img
              v-if="
                showPlayIcon &&
                currentVideoIndex === renderWindow.start + index &&
                shouldLoadMedia(renderWindow.start + index)
              "
              id="play_icon"
              class="media_state_icons"
              src="/icons/play.svg"
              alt=""
            />
          </transition>
          <transition name="fade">
            <img
              v-if="
                showPauseIcon &&
                currentVideoIndex === renderWindow.start + index &&
                shouldLoadMedia(renderWindow.start + index)
              "
              id="pause_icon"
              class="media_state_icons"
              src="/icons/pause.svg"
              alt="pause_icon"
            />
          </transition>
          <transition name="fade">
            <img
              v-if="
                showSoundOnIcon &&
                currentVideoIndex === renderWindow.start + index &&
                shouldLoadMedia(renderWindow.start + index)
              "
              id="sound_on_icon"
              class="media_state_icons"
              src="/icons/sound_on.svg"
              alt=""
            />
          </transition>
          <transition name="fade">
            <img
              v-if="
                showSoundOffIcon &&
                currentVideoIndex === renderWindow.start + index &&
                shouldLoadMedia(renderWindow.start + index)
              "
              id="sound_off_icon"
              class="media_state_icons"
              src="/icons/sound_off.svg"
              alt=""
            />
          </transition>

          <!-- Кнопка запуска при заблокированном автоплее -->
          <div
            v-if="
              autoplayBlocked &&
              currentVideoIndex === renderWindow.start + index &&
              shouldLoadMedia(renderWindow.start + index)
            "
            @click="handleFirstUserInteraction($event)"
            class="autoplay_blocked_overlay"
          >
            <img src="/icons/play.svg" alt="Запустить видео" class="autoplay_blocked_play_icon" />
          </div>

          <div v-if="game.game_slug !== 'final_popup'">
            <img
              v-if="!autoplayBlocked"
              class="gradient"
              src="/icons/gradient.svg"
              alt=""
              @click="toggleVideoPause($event)"
            />
            <img
              @click="toggleSound"
              class="sound_icon"
              :src="soundOn ? './icons/sound.svg' : './icons/sound_off.svg'"
              alt="sound_button"
            />
            <img
              v-if="game.game_slug !== 'final_popup'"
              @click="toggleLike(game.game_slug)"
              class="like_icon"
              :src="isLiked(game.game_slug) ? './icons/like_on.svg' : './icons/like_off.svg'"
              alt="like_button"
            />
          </div>
          <div
            class="progress_bg"
            v-if="game.game_slug !== 'final_popup' && shouldLoadMedia(renderWindow.start + index)"
          ></div>
          <div
            class="progress_bar"
            :style="{ width: videoProgress + '%' }"
            v-if="game.game_slug !== 'final_popup' && shouldLoadMedia(renderWindow.start + index)"
          ></div>
        </div>

        <!-- [DP-11241][P0] Нижний спейсер виртуализации -->
        <div :style="{ height: bottomSpacerHeight + 'px' }"></div>
      </div>
    </div>

    <div class="arrow_container">
      <div
        class="arrow top"
        @click="scrollToVideo('backwards')"
        style="background-image: url(icons/arrow.svg)"
      ></div>
      <div
        class="arrow bottom"
        @click="scrollToVideo('forwards')"
        style="background-image: url(icons/arrow.svg)"
      ></div>
    </div>
    <div
      style="
        display: none !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
      "
    >
      <img src="/icons/like_on.svg" alt="like_on" />
      <img src="/icons/like_off.svg" alt="like_off" />
      <img src="/icons/sound_on.svg" alt="sound_on" />
      <img src="/icons/sound_off.svg" alt="sound_off" />
      <img src="/icons/play.svg" alt="play" />
      <img src="/icons/pause.svg" alt="pause" />
      <img src="/icons/sound.svg" alt="sound" />
      <img src="/icons/sound_off.svg" alt="sound_off" />
    </div>

    <!-- [DP-11241][P1] GameInfo: один рендер, далее реактивные обновления -->
    <GameInfo
      v-if="activeGame && activeGame.game_slug !== 'final_popup'"
      :thumb="getThumbPath(activeGame.src)"
      :provider_link="activeGame.provider_slug"
      :name="activeGame.name"
      :provider="activeGame.provider"
      :game-id="activeGame.game_slug"
      @play-game="onPlayGame"
      @go-to-provider="onGoToProvider"
      @go-to-external-link="onGoToExternalLink"
      :button-text="$t('play_button')"
      :sign-up-button="$t('sign_up_button')"
      :no-demo="activeGame.no_demo"
      :is-user-loged-in="isUserLogedIn"
      :external-link="activeGame.external_link"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  Ref,
  getCurrentInstance,
  nextTick,
} from 'vue'
import type { Game as GameData } from './types/game'
import { useGamesData } from './composables/useGamesData'
import smoothscroll from 'smoothscroll-polyfill'
import GameInfo from './components/gameInfo.vue'
import FinalPopup from './components/finalIPopup.vue'
import { devLog, devWarn, devError } from './utils/devLog'
import {
  sendReelsUnmute,
  sendReelsMute,
  sendReelsLikedGame,
  sendReelsGoToGame,
  sendReelsGoToProvider,
  sendReelsCurrentVideo,
  sendReelsWatchedAllVideo,
  sendReelsVideo15secWatched,
  sendReelsForward,
  sendReelsBackward,
  sendReelsReady,
  sendReelsPlay,
  sendReelsPause,
  sendReelsRewatchTrends,
  sendReelsFeedback,
  sendReelsExternalLink,
} from './components/parentMessages'

// Интерфейс игры для использования в приложении
interface Game {
  name: string
  provider: string
  provider_slug: string
  game_slug: string
  src: string
  supportedCurrencies: string[] | 'all'
  no_demo?: boolean
  external_link?: {
    url: string
    localeKey: string
  }
  dont_hide?: boolean
}

// Функции для генерации путей к медиафайлам
function getThumbPath(src: string): string {
  return `/thumbs/${src}.webp`
}

function getPosterPath(src: string): string {
  return `/video/posters/${src}.webp`
}

// Рекативные переменные
const games = ref<Game[]>([])
const currentVideo: Ref<HTMLVideoElement | null> = ref(null)
const currentVideoIndex = ref<number>(0)
const screenWidth = ref(window.innerWidth)
const videos_container = ref<HTMLElement | null>(null)
const soundOn = ref<boolean>(false)
const videoRefs = ref<(HTMLVideoElement | null)[]>([])
const currentVideoScreenId = ref<number>(0)
const likedGames = ref<string[]>([])
const watchedVideosLong = ref<string[]>([])
const showPlayIcon = ref<boolean>(false)
const showPauseIcon = ref<boolean>(false)
const showSoundOnIcon = ref<boolean>(false)
const showSoundOffIcon = ref<boolean>(false)
const videoProgress = ref<number>(0)
const viewedLongEnough = ref<string[]>([])
const orientationChanged = ref(false)
const userCurrency = ref<string>('')
const userRegion = ref<'global' | 'au'>('global')
const isUserLogedIn = ref<boolean>(false)
const parentOrigin = ref<string>('')
const wasManuallyPaused = ref<boolean>(false)

// Переменные для управления автоплеем и мобильными устройствами
const userHasInteracted = ref<boolean>(false)
const isMobileDevice = ref<boolean>(false)
const isLowPowerMode = ref<boolean>(false)
const canAutoplay = ref<boolean>(true)
const playAttempts = ref<Map<number, number>>(new Map())
const pendingPlayPromises = ref<Set<number>>(new Set())

// [DP-11241][P1] iOS детекция и прайминг для разблокировки автоплея в Low Power Mode
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
const hasPrimedVideos = ref<boolean>(false)

// Переменная для interval мониторинга памяти
const memoryCheckInterval = ref<number | null>(null)

// Флаг для предотвращения конфликтов при воспроизведении
const isPlaybackOperationInProgress = ref<boolean>(false)

// Переменная для отслеживания заблокированного автоплея
const autoplayBlocked = ref<boolean>(false)

// Переменные для управления памятью
const loadedMediaRange = ref<{ start: number; end: number }>({ start: 0, end: 2 })
// [DP-11241][P0] Буфер видимых элементов вокруг активного видео
const uiRange = ref<{ start: number; end: number }>({ start: 0, end: 2 })
// [DP-11241][P0] Оконный рендер: держим в DOM только текущие ±4
const renderWindow = ref<{ start: number; end: number }>({ start: 0, end: 9 })
const visibleGames = computed(() => {
  const s = Math.max(0, renderWindow.value.start)
  const e = Math.min(games.value.length, renderWindow.value.end + 1)
  return games.value.slice(s, e)
})

// [DP-11241][P0] Высота одного элемента (фуллскрин-карточки = viewport)
const itemHeight = ref<number>(window.innerHeight)

// [DP-11241][P0] Верхний спейсер: компенсирует скрытые элементы сверху окна
const topSpacerHeight = computed(() => renderWindow.value.start * itemHeight.value)

// [DP-11241][P0] Нижний спейсер: компенсирует скрытые элементы снизу окна
const bottomSpacerHeight = computed(
  () => (games.value.length - (renderWindow.value.end + 1)) * itemHeight.value
)

// [DP-11241][P1] Активная игра для фиксированной панели GameInfo
const activeGame = computed(() => games.value[currentVideoIndex.value] || null)
const unloadTimeout = ref<number | null>(null)
const observer = ref<IntersectionObserver | null>(null)
const lastVideoChangeTime = ref<number>(0)
const currentVideoProgressHandler = ref<((event: Event) => void) | null>(null)

// Переменные для передачи данных игры
let gameSlug: string = ''
let gameName: string = ''
let providerSlug: string = ''
let providerName: string = ''

let isPortrait = false

// Загруженные данные игр из JSON
let loadedGamesData: GameData[] = []

/**
 * [DP-11241][P1] Разблокирует соседние видео для автоплея на iOS Low Power Mode
 * Короткая последовательность play() → pause() получает разрешение браузера на воспроизведение
 *
 * @param centerIndex - индекс текущего активного видео
 * @param radius - радиус соседних видео для разблокировки (по умолчанию 3)
 */
function primeNearbyVideos(centerIndex: number, radius: number = 3): void {
  if (!isIOS) return

  const start = Math.max(0, centerIndex - radius)
  const end = Math.min(games.value.length - 1, centerIndex + radius)

  let primedCount = 0

  for (let i = start; i <= end; i++) {
    if (i === centerIndex) continue // текущее видео не трогаем

    const video = videoRefs.value[i]
    if (!video) continue

    try {
      // Настройка атрибутов для iOS
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')
      video.muted = true

      // Короткий play/pause разблокирует видео для автоплея
      video
        .play()
        .then(() => {
          video.pause()
        })
        .catch(() => {
          // Ошибки игнорируются
        })

      primedCount++
    } catch (error) {
      // Игнорим ошибки отдельных видео
    }
  }

  hasPrimedVideos.value = true
}

/**
 * Детектирует мобильные устройства и режим энергосбережения
 */
function detectDeviceCapabilities(): void {
  // Детекция мобильного устройства
  const userAgent = navigator.userAgent.toLowerCase()
  isMobileDevice.value = /iphone|ipad|ipod|android|mobile/i.test(userAgent)

  // Детекция iPhone
  const isIPhone = /iphone|ipod/i.test(userAgent)

  // Проверка режима энергосбережения (косвенно через navigator.connection)
  isLowPowerMode.value = false // По умолчанию считаем что режим экономии выключен

  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    if (connection) {
      // Если включен Data Saver или очень медленное соединение - считаем режимом энергосбережения
      isLowPowerMode.value =
        connection.saveData ||
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g'
    }
  }

  // Для начала предполагаем что автоплей возможен
  // Реальная проверка будет в onIntersection при попытке воспроизведения
  canAutoplay.value = true
}

/**
 * Безопасное воспроизведение видео с обработкой ошибок
 */
async function safeVideoPlay(
  video: HTMLVideoElement,
  videoIndex: number,
  resetTime: boolean = true
): Promise<boolean> {
  if (!video || pendingPlayPromises.value.has(videoIndex)) {
    return false
  }

  pendingPlayPromises.value.add(videoIndex)
  const maxAttempts = 3
  const currentAttempts = playAttempts.value.get(videoIndex) || 0

  try {
    // Устанавливаем базовые свойства
    video.muted = !soundOn.value

    // Сбрасываем время только если это новое видео или явно требуется сброс
    if (resetTime) {
      video.currentTime = 0
    }

    // Пытаемся воспроизвести
    const playPromise = video.play()

    if (playPromise !== undefined) {
      await playPromise
      playAttempts.value.delete(videoIndex) // Сбрасываем счетчик при успехе

      // Если автоплей сработал, сбрасываем флаг блокировки
      if (autoplayBlocked.value) {
        autoplayBlocked.value = false
        canAutoplay.value = true
      }

      return true
    }

    return false
  } catch (error: any) {
    // AbortError возникает при быстрой смене видео — это нормально, не блокируем автоплей
    if (error?.name === 'AbortError') return false

    console.error('Ошибка воспроизведения видео (автоплей заблокирован):', error)

    // Увеличиваем счетчик попыток
    playAttempts.value.set(videoIndex, currentAttempts + 1)

    // NotAllowedError означает что браузер требует жест пользователя для воспроизведения
    if (error?.name === 'NotAllowedError') {
      autoplayBlocked.value = true
      canAutoplay.value = false
    }

    // Если превышено количество попыток, окончательно отключаем автоплей
    if (currentAttempts >= maxAttempts) {
      console.warn('Превышено количество попыток автоплея, окончательно отключаем')
    }

    return false
  } finally {
    pendingPlayPromises.value.delete(videoIndex)
  }
}

/**
 * Обработчик первого пользовательского взаимодействия
 */
function handleFirstUserInteraction(event?: Event): void {
  // Останавливаем всплытие события чтобы не сработал toggleVideoPause
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }

  // Предотвращаем одновременное выполнение операций воспроизведения
  if (isPlaybackOperationInProgress.value) {
    return
  }

  isPlaybackOperationInProgress.value = true

  // Отмечаем что пользователь взаимодействовал
  userHasInteracted.value = true

  // Удаляем слушатели после первого взаимодействия
  document.removeEventListener('touchstart', handleFirstUserInteraction)
  document.removeEventListener('click', handleFirstUserInteraction)
  document.removeEventListener('keydown', handleFirstUserInteraction)

  const video = currentVideo.value
  if (!video) {
    isPlaybackOperationInProgress.value = false
    return
  }

  try {
    // На iOS сразу разблокируем соседние видео пока есть разрешение от браузера
    if (isIOS) {
      primeNearbyVideos(currentVideoIndex.value, 3)
    }

    // Запускаем текущее видео
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.muted = !soundOn.value
    video.play()

    autoplayBlocked.value = false
    canAutoplay.value = true
    wasManuallyPaused.value = false
    showPlayIcon.value = true
    setTimeout(() => (showPlayIcon.value = false), 300)
    sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
  } catch (error) {
    console.error('Ошибка запуска видео после взаимодействия:', error)
    autoplayBlocked.value = true
  } finally {
    isPlaybackOperationInProgress.value = false
  }
}

/**
 * Преобразует данные из объединенной структуры в формат, используемый в приложении
 */
function transformGamesData(region: 'global' | 'au'): Game[] {
  return loadedGamesData
    .filter(game => game.regions[region]) // Фильтруем только игры для нужного региона
    .map(game => {
      const regionData = game.regions[region]!

      const transformed = {
        name: game.name,
        provider: regionData.provider,
        provider_slug: regionData.provider_slug,
        game_slug: regionData.game_slug,
        src: game.src,
        supportedCurrencies: game.supportedCurrencies[region] || [],
        no_demo: game.no_demo,
        external_link: game.external_link,
        dont_hide: game.dont_hide,
      }
      return transformed
    })
}

// Функция масштабирования
function adjustScale(): void {
  const vh = Math.round(window.innerHeight / 100)
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

function toggleSound(): void {
  soundOn.value = !soundOn.value
  if (currentVideo.value) {
    currentVideo.value.muted = !soundOn.value
    if (soundOn.value) {
      showSoundOnIcon.value = true
      setTimeout(() => (showSoundOnIcon.value = false), 300)
      sendReelsUnmute(gameSlug, gameName, providerSlug, providerName)
    } else {
      showSoundOffIcon.value = true
      setTimeout(() => (showSoundOffIcon.value = false), 300)
      sendReelsMute(gameSlug, gameName, providerSlug, providerName)
    }
  }
}

function isLiked(gameSlug: string): boolean {
  return likedGames.value.includes(gameSlug)
}

function toggleLike(gameSlug: string): void {
  const index = likedGames.value.indexOf(gameSlug)
  if (index !== -1) {
    likedGames.value.splice(index, 1)
  } else {
    likedGames.value.push(gameSlug)
    sendReelsLikedGame(gameSlug, gameName, providerSlug, providerName)
  }
  localStorage.setItem('likedGames', JSON.stringify(likedGames.value))
}

function onPlayGame(gameSlug: string): void {
  setTimeout(() => {
    sendReelsGoToGame(gameSlug, gameName, providerSlug, providerName)
  }, 100)
}

function onGoToProvider(provider: string): void {
  setTimeout(() => {
    sendReelsGoToProvider(gameSlug, gameName, providerSlug, providerName)
  }, 100)
}

function getParentOrigin(): string {
  // Сначала пробуем получить сохраненный origin родителя
  if (parentOrigin.value) {
    return parentOrigin.value
  }

  // Пробуем получить через window.parent (может быть заблокировано CORS)
  try {
    const parentUrl = window.parent.location.origin
    if (parentUrl && parentUrl !== window.location.origin) {
      return parentUrl
    }
  } catch (e) {
    devWarn('[DP-11241] Не удается получить parent origin через window.parent:', e)
  }

  // Пробуем получить из document.referrer
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer)
      return referrerUrl.origin
    } catch (e) {
      console.error('Невалидный referrer URL:', e)
    }
  }

  // Последний fallback - используем winspirit3.com
  console.warn('Используем fallback - winspirit3.com')
  return 'https://winspirit3.com'
}

function onGoToExternalLink(pathname: string): void {
  // Ставим видео на паузу перед открытием ссылкиам
  if (currentVideo.value && !currentVideo.value.paused) {
    currentVideo.value.pause()
    wasManuallyPaused.value = true
    showPauseIcon.value = true
    setTimeout(() => (showPauseIcon.value = false), 300)
    sendReelsPause(gameSlug, gameName, providerSlug, providerName)
  }

  // Разделяем pathname на путь и query параметры
  const [path, queryString] = pathname.split('?')

  // Получаем надежный origin родителя
  const parentUrl = getParentOrigin()
  const linkUrl = `${parentUrl}${path}${queryString ? '?' + queryString : ''}`

  // Отправляем аналитическое сообщение с pathname в label
  sendReelsExternalLink(gameSlug, gameName, providerSlug, providerName, path)

  window.open(linkUrl, '_blank')
}

function scrollToElement(element: HTMLElement): void {
  try {
    element.scrollIntoView({ behavior: 'smooth' })
  } catch {
    const top = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

function scrollToVideo(direction: 'forwards' | 'backwards'): void {
  const numGames = games.value.length
  if (direction === 'forwards') {
    if (currentVideoScreenId.value < numGames - 1) {
      currentVideoScreenId.value = (currentVideoScreenId.value + 1) % numGames
    } else {
      return
    }
  } else {
    if (currentVideoScreenId.value > 0) {
      currentVideoScreenId.value = (currentVideoScreenId.value - 1) % numGames
    } else {
      return
    }
  }

  const currentGame = games.value[currentVideoScreenId.value]
  const videoScreen = document.getElementById(currentGame.game_slug)
  if (videoScreen) {
    scrollToElement(videoScreen)
  }
}

const observerOptions: IntersectionObserverInit = {
  root: null,
  // [DP-11241][P0] Ранний триггер для прелоада соседей на мобилках
  rootMargin: '20% 0px',
  threshold: 0.3,
}

let finalObserver: IntersectionObserver | null = null
// [DP-11241][P0] Последовательность воспроизведения для устранения гонок play/pause
let playSeq = 0
let intersectionTimeout: number | null = null

function handleFinalIntersection(entries: IntersectionObserverEntry[]) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      sendReelsFeedback('', '', '', '')
      getWatchedVideosLong()
      sendReelsWatchedAllVideo('', '', '', '')
    }
  })
}

/**
 * Определяет, нужно ли загружать медиа (постеры) для данного индекса
 */
function shouldLoadMedia(index: number): boolean {
  // [DP-11241][P0] Используем быстрое UI-окно вместо отложенного
  return index >= uiRange.value.start && index <= uiRange.value.end
}

/**
 * Определяет, нужно ли загружать источники видео для данного индекса
 */
function shouldLoadSources(index: number): boolean {
  // Загружаем видео источники для текущего ±2 элементов
  const range = 2
  return Math.abs(index - currentVideoIndex.value) <= range
}

/**
 * Устанавливает ref для видео элемента
 */
function setVideoRef(el: HTMLVideoElement | null, index: number): void {
  if (el) {
    videoRefs.value[index] = el
    // Добавляем observer только для новых элементов
    if (observer.value && !el.dataset.observed) {
      observer.value.observe(el)
      el.dataset.observed = 'true'
    }

    // iOS: разблокируем новые видео, появившиеся в DOM после первого взаимодействия
    if (isIOS && userHasInteracted.value && hasPrimedVideos.value) {
      const distance = Math.abs(index - currentVideoIndex.value)
      if (distance <= 3 && distance > 0) {
        el.setAttribute('playsinline', '')
        el.setAttribute('webkit-playsinline', '')
        el.muted = true
        void el
          .play()
          ?.then(() => el.pause())
          .catch(() => {})
      }
    }
  } else {
    // Очищаем ref при размонтировании
    if (videoRefs.value[index]) {
      const video = videoRefs.value[index]
      if (video && observer.value) {
        observer.value.unobserve(video)
        delete video.dataset.observed
      }
      videoRefs.value[index] = null
    }
  }
}

/**
 * Debounce функция для предотвращения частых вызовов
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Выгружает видео и постеры, находящиеся далеко от текущего
 */
function unloadDistantVideos(): void {
  // Уменьшаем диапазон на мобильных устройствах для экономии памяти
  const baseMediaRange = isMobileDevice.value || isLowPowerMode.value ? 1 : 2
  const baseProtect = 1 // [DP-11241][P0] Не чистим current ±1 при освобождении памяти

  // iOS: после разблокировки расширяем защиту до ±3, чтобы не удалить их
  const protect = isIOS && hasPrimedVideos.value ? Math.max(baseProtect, 3) : baseProtect

  const currentIndex = currentVideoIndex.value

  // Обновляем диапазон загружаемых медиа
  loadedMediaRange.value = {
    start: Math.max(0, currentIndex - baseMediaRange),
    end: Math.min(games.value.length - 1, currentIndex + baseMediaRange),
  }

  // Выгружаем видео, которые находятся вне диапазона
  videoRefs.value.forEach((video, index) => {
    if (video && Math.abs(index - currentIndex) > baseMediaRange + protect) {
      // Останавливаем воспроизведение и очищаем источники
      video.pause()
      video.removeAttribute('src')
      video.removeAttribute('poster')

      // На мобильных устройствах более агрессивно очищаем
      if (isMobileDevice.value || isLowPowerMode.value) {
        // Очищаем все source элементы
        const sources = video.querySelectorAll('source')
        sources.forEach(source => source.removeAttribute('src'))

        // Сбрасываем preload
        video.preload = 'none'
      }

      video.load() // Принудительно очищаем буферы

      // Удаляем из observer
      if (observer.value) {
        observer.value.unobserve(video)
        delete video.dataset.observed
      }

      // Очищаем ref
      videoRefs.value[index] = null
    }
  })

  // Принудительная сборка мусора (если доступна)
  if (window.gc) {
    window.gc()
  }
}

/**
 * Мониторинг использования памяти и принудительная очистка
 */
function checkMemoryUsage(): void {
  if ('memory' in performance) {
    const memInfo = (performance as any).memory
    const memoryUsageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit

    // Если используется больше 80% доступной памяти
    if (memoryUsageRatio > 0.8) {
      console.warn('Высокое использование памяти, принудительная очистка:', memoryUsageRatio)

      // Более агрессивная очистка
      const currentIndex = currentVideoIndex.value
      videoRefs.value.forEach((video, index) => {
        if (video && Math.abs(index - currentIndex) > 0) {
          video.pause()
          video.removeAttribute('src')
          video.removeAttribute('poster')
          const sources = video.querySelectorAll('source')
          sources.forEach(source => source.removeAttribute('src'))
          video.preload = 'none'
          video.load()

          if (observer.value) {
            observer.value.unobserve(video)
            delete video.dataset.observed
          }
          videoRefs.value[index] = null
        }
      })

      // Обновляем диапазон загрузки
      loadedMediaRange.value = {
        start: currentIndex,
        end: currentIndex,
      }

      if (window.gc) {
        window.gc()
      }
    }
  }
}

/**
 * Отложенная выгрузка видео с debounce
 */
const debouncedUnloadVideos = debounce(unloadDistantVideos, 1000)

/**
 * Обновляет диапазон загружаемых видео при смене текущего видео
 */
// [DP-11241][P0] Функции для быстрого обновления UI-окна и рендер-окна
function updateUiRange(): void {
  const buf = isMobileDevice.value ? 3 : 2
  const i = currentVideoIndex.value
  uiRange.value = {
    start: Math.max(0, i - buf),
    end: Math.min(games.value.length - 1, i + buf),
  }
}

function updateRenderWindow(): void {
  const buf = 4
  const i = currentVideoIndex.value
  renderWindow.value = {
    start: Math.max(0, i - buf),
    end: Math.min(games.value.length - 1, i + buf),
  }
}

function updateMediaRange(): void {
  // Отменяем предыдущий таймер
  if (unloadTimeout.value) {
    clearTimeout(unloadTimeout.value)
  }

  // [DP-11241][P0] Быстрое обновление окна (чтобы UI не ждал)
  const mr = isMobileDevice.value || isLowPowerMode.value ? 1 : 2
  const i = currentVideoIndex.value
  loadedMediaRange.value = {
    start: Math.max(0, i - mr),
    end: Math.min(games.value.length - 1, i + mr),
  }

  // На мобильных устройствах сразу проверяем память
  if (isMobileDevice.value || isLowPowerMode.value) {
    checkMemoryUsage()
  }

  // Запускаем отложенную выгрузку
  unloadTimeout.value = window.setTimeout(() => {
    debouncedUnloadVideos()

    // Дополнительная проверка памяти после выгрузки
    if (isMobileDevice.value || isLowPowerMode.value) {
      setTimeout(checkMemoryUsage, 500)
    }
  }, 1000)
}

function updateVideoProgress(): void {
  if (currentVideo.value) {
    const { currentTime, duration } = currentVideo.value
    const progress = (currentTime / duration) * 100
    videoProgress.value = progress

    const currentGame = games.value[currentVideoIndex.value]
    if (!currentGame) return

    const isLongEnough = currentTime >= 15
    const isProgressComplete = progress >= 30
    const currentGameSlug = currentGame.game_slug
    const shouldTrackCompletion =
      isProgressComplete &&
      !watchedVideosLong.value.includes(currentGameSlug) &&
      currentGameSlug !== 'final_popup' &&
      !currentGame.dont_hide

    if (isLongEnough && !viewedLongEnough.value.includes(currentGameSlug)) {
      viewedLongEnough.value.push(currentGameSlug)
      sendReelsVideo15secWatched(
        currentGameSlug,
        currentGame.name,
        currentGame.provider_slug,
        currentGame.provider
      )
    }

    if (shouldTrackCompletion) {
      watchedVideosLong.value = [...watchedVideosLong.value, currentGameSlug]
      throttle(() => {
        localStorage.setItem('watchedVideosLong', JSON.stringify(watchedVideosLong.value))
      }, 1000)()
    }
  }
}

/**
 * Добавляет слушатель прогресса на текущее активное видео
 */
function addVideoProgressListener(video: HTMLVideoElement): void {
  // Удаляем предыдущий слушатель если он есть
  removeVideoProgressListener()

  // Создаем новый слушатель
  currentVideoProgressHandler.value = () => updateVideoProgress()
  video.addEventListener('timeupdate', currentVideoProgressHandler.value)

  // [DP-11241][P0] Прелоад постера следующего при событии playing
  const onPlaying = () => {
    const next = games.value[currentVideoIndex.value + 1]
    if (!next) return
    const img = new Image()
    img.decoding = 'async'
    img.src = getPosterPath(next.src)
  }
  video.addEventListener('playing', onPlaying, { once: true })
}

/**
 * Удаляет слушатель прогресса с предыдущего видео
 */
function removeVideoProgressListener(): void {
  if (currentVideo.value && currentVideoProgressHandler.value) {
    currentVideo.value.removeEventListener('timeupdate', currentVideoProgressHandler.value)
    currentVideoProgressHandler.value = null
  }
}

function onIntersection(entries: IntersectionObserverEntry[]): void {
  // [DP-11241][P0] Debounce обработки пересечений при быстром скролле
  if (intersectionTimeout) {
    clearTimeout(intersectionTimeout)
  }

  intersectionTimeout = window.setTimeout(() => {
    intersectionTimeout = null
    processIntersection(entries)
  }, 16) // [DP-11241][P0] 1 кадр (16ms) — сглаживает инерцию и дребезг при скролле
}

function processIntersection(entries: IntersectionObserverEntry[]): void {
  entries.forEach(entry => {
    const video = entry.target as HTMLVideoElement
    const container = video.closest('.video_screen') as HTMLElement | null
    if (!container) return

    const gameSlug1 = container.id
    const game = games.value.find(g => g.game_slug === gameSlug1)
    const videoIndex = games.value.findIndex(g => g.game_slug === gameSlug1)

    if (entry.isIntersecting) {
      // [DP-11241][P0] Последовательное воспроизведение: сперва пауза предыдущего
      if (currentVideo.value && currentVideo.value !== video && !currentVideo.value.paused) {
        currentVideo.value.muted = true
        currentVideo.value.pause()
      }

      const seq = ++playSeq // [DP-11241][P0] Инкрементируем после остановки предыдущего

      // Удаляем слушатель с предыдущего видео
      removeVideoProgressListener()

      // Устанавливаем новое текущее видео
      currentVideo.value = video

      // Добавляем слушатель на новое активное видео
      addVideoProgressListener(video)

      // Обновляем индекс и запускаем выгрузку
      if (videoIndex !== -1 && videoIndex !== currentVideoIndex.value) {
        currentVideoIndex.value = videoIndex
        lastVideoChangeTime.value = Date.now()
        updateUiRange()
        updateRenderWindow()
        updateMediaRange()
      }

      // Обновляем информацию об игре
      if (game) {
        gameSlug = game.game_slug
        gameName = game.name
        providerSlug = game.provider_slug
        providerName = game.provider
      }

      // Сбрасываем состояние паузы
      wasManuallyPaused.value = false
      video.style.opacity = '1'

      // Безопасно пытаемся запустить видео
      if (videoIndex !== -1) {
        void safeVideoPlay(video, videoIndex).then(success => {
          if (success && seq === playSeq) {
            video.muted = !soundOn.value
            // Отправляем аналитическое событие только при успешном запуске
            setTimeout(() => {
              if (!orientationChanged.value) {
                sendReelsCurrentVideo(gameSlug, gameName, providerSlug, providerName)
              }
            }, 300)
          }
        })
      }
    } else {
      // Видео покидает viewport
      if (!video.paused) {
        video.pause()
      }
      video.style.opacity = '0'

      // Очищаем слушатель прогресса только если это текущее видео
      if (currentVideo.value === video) {
        removeVideoProgressListener()
        currentVideo.value = null
      }
    }
  })
}

function toggleVideoPause(event?: Event): void {
  // Останавливаем всплытие события
  if (event) {
    event.stopPropagation()
  }

  // Предотвращаем одновременное выполнение операций воспроизведения
  if (isPlaybackOperationInProgress.value) {
    return
  }

  // Предотвращаем переключение в первые 1 секунду после смены видео
  const now = Date.now()
  if (now - lastVideoChangeTime.value < 1000) {
    return
  }

  isPlaybackOperationInProgress.value = true

  if (currentVideo.value) {
    const videoIndex = videoRefs.value.indexOf(currentVideo.value)

    if (currentVideo.value.paused) {
      // Пытаемся запустить видео безопасно без сброса времени воспроизведения
      if (videoIndex !== -1) {
        void safeVideoPlay(currentVideo.value, videoIndex, false)
          .then(success => {
            if (success) {
              wasManuallyPaused.value = false
              showPlayIcon.value = true
              setTimeout(() => (showPlayIcon.value = false), 300)
              sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
            } else {
              // Если автоплей не сработал, пробуем напрямую
              void currentVideo
                .value!.play()
                .then(() => {
                  wasManuallyPaused.value = false
                  showPlayIcon.value = true
                  setTimeout(() => (showPlayIcon.value = false), 300)
                  sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
                })
                .catch(console.error)
            }
            isPlaybackOperationInProgress.value = false
          })
          .catch(() => {
            isPlaybackOperationInProgress.value = false
          })
      } else {
        isPlaybackOperationInProgress.value = false
      }
    } else {
      currentVideo.value.pause()
      wasManuallyPaused.value = true
      showPauseIcon.value = true
      setTimeout(() => (showPauseIcon.value = false), 300)
      sendReelsPause(gameSlug, gameName, providerSlug, providerName)
      isPlaybackOperationInProgress.value = false
    }
  } else {
    isPlaybackOperationInProgress.value = false
  }
}

function throttle(fn: Function, delay: number) {
  let lastCall = 0
  return (...args: any[]) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

// Отслеживаем изменения currentVideoIndex для отправки аналитических событий
watch(currentVideoIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined) {
    if (newIndex > oldIndex && gameSlug && !orientationChanged.value) {
      sendReelsForward(gameSlug, gameName, providerSlug, providerName)
    } else if (newIndex < oldIndex && gameSlug && !orientationChanged.value) {
      sendReelsBackward(gameSlug, gameName, providerSlug, providerName)
    }
  }
})

function checkOrientation(): void {
  const { orientation } = window.screen
  if (orientation) {
    const { angle } = orientation
    const wasPortrait = isPortrait
    isPortrait = angle === 0 || angle === 180
    if (wasPortrait !== isPortrait) {
      orientationChanged.value = true
      setTimeout(() => {
        orientationChanged.value = false
      }, 500)
    }
  }
}

function handleVisibilityChange(): void {
  // Если вкладка стала неактивной, ставим видео на паузу
  if (document.hidden) {
    if (currentVideo.value && !currentVideo.value.paused) {
      currentVideo.value.pause()
      sendReelsPause(gameSlug, gameName, providerSlug, providerName)
    }
  } else {
    // Если вкладка стала видимой и есть активное видео, которое не было остановлено вручную
    if (currentVideo.value && currentVideo.value.paused && !wasManuallyPaused.value) {
      const videoIndex = videoRefs.value.indexOf(currentVideo.value)
      if (videoIndex !== -1) {
        void safeVideoPlay(currentVideo.value, videoIndex, false).then(success => {
          if (success) {
            showPlayIcon.value = true
            setTimeout(() => (showPlayIcon.value = false), 300)
            sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
          }
        })
      }
    }
  }
}

// Функции для модификации массива игр до рендера
function filterGamesByCurrency() {
  if (userCurrency.value) {
    const currencyLower = userCurrency.value.toLowerCase()
    games.value = games.value.filter(game => {
      return (
        game.supportedCurrencies === 'all' ||
        (Array.isArray(game.supportedCurrencies) &&
          game.supportedCurrencies.some(cur => cur.toLowerCase() === currencyLower))
      )
    })
  }
}

function removeWatchedGames(): void {
  const storedwatchedVideosLong = localStorage.getItem('watchedVideosLong')
  if (storedwatchedVideosLong) {
    const watchedVideosLongArray: string[] = JSON.parse(storedwatchedVideosLong)
    games.value = games.value.filter(game => !watchedVideosLongArray.includes(game.game_slug))
  }
}

function reinitializeGames(): void {
  // Очищаем все refs и observers перед реинициализацией
  videoRefs.value.forEach((video, index) => {
    if (video && observer.value) {
      observer.value.unobserve(video)
      delete video.dataset.observed
    }
  })
  videoRefs.value = []

  // Заново получаем игры для нужного региона
  games.value = transformGamesData(userRegion.value)

  // Применяем все фильтры заново
  filterGamesByCurrency()
  // НЕ вызываем removeWatchedGames(), так как localStorage уже очищен
  addFinalPopup()

  // Сбрасываем состояние
  currentVideoIndex.value = 0
  currentVideoScreenId.value = 0
  watchedVideosLong.value = []
  viewedLongEnough.value = []
  videoProgress.value = 0
  loadedMediaRange.value = { start: 0, end: 2 }
  lastVideoChangeTime.value = Date.now()

  // Сбрасываем флаги автоплея
  autoplayBlocked.value = false
  canAutoplay.value = true
  userHasInteracted.value = false

  // Добавляем слушатели обратно если на мобильном устройстве
  if (isMobileDevice.value) {
    document.addEventListener('touchstart', handleFirstUserInteraction)
    document.addEventListener('click', handleFirstUserInteraction)
    document.addEventListener('keydown', handleFirstUserInteraction)
  }

  // Обновляем переменные текущей игры
  if (games.value.length > 0) {
    const firstGame = games.value[0]
    gameSlug = firstGame.game_slug
    gameName = firstGame.name
    providerSlug = firstGame.provider_slug
    providerName = firstGame.provider
  }
}

function rewatchTrends(): void {
  sendReelsRewatchTrends('', '', '', '')
  localStorage.removeItem('watchedVideosLong')

  // Останавливаем текущее видео если оно играет
  if (currentVideo.value && !currentVideo.value.paused) {
    currentVideo.value.pause()
  }

  // Очищаем слушатель прогресса перед реинициализацией
  removeVideoProgressListener()

  setTimeout(() => {
    reinitializeGames()

    // Ждем следующий тик для обновления DOM
    setTimeout(() => {
      scrollToTop()

      // Переинициализируем observers для новых элементов
      if (observer.value) {
        videoRefs.value.forEach(video => {
          if (video && !video.dataset.observed) {
            observer.value!.observe(video)
            video.dataset.observed = 'true'
          }
        })
      }
    }, 50)
  }, 100)
}

function addFinalPopup(): void {
  games.value.push({
    name: '',
    provider: '',
    provider_slug: '',
    game_slug: 'final_popup',
    src: '',
    supportedCurrencies: [],
    dont_hide: true,
  })
}

function scrollToTop(): void {
  const firstGameElement = document.getElementById(games.value[0]?.game_slug)
  if (firstGameElement) {
    firstGameElement.scrollIntoView({ behavior: 'auto' })
  }
}

function getWatchedVideosLong(): void {
  const storedwatchedVideosLong = localStorage.getItem('watchedVideosLong')
  if (storedwatchedVideosLong) {
    watchedVideosLong.value = JSON.parse(storedwatchedVideosLong)
  }
}

// Инициализация параметров из URL до рендера
const fullURL = window.location.href
const queryStartIndex = fullURL.indexOf('?')
if (queryStartIndex !== -1) {
  const queryPart = fullURL.slice(queryStartIndex + 1)
  const params = queryPart.split('&').reduce((acc: Record<string, string>, pair: string) => {
    const [key, value] = pair.split('=')
    acc[key] = decodeURIComponent(value)
    return acc
  }, {})

  if (params.user_language) {
    const instance = getCurrentInstance()
    if (instance) {
      const setLocale = instance.appContext.config.globalProperties.$setLocale as (
        locale: string
      ) => void
      setLocale(params.user_language)
    }
  }
  if (params.user_currency) {
    userCurrency.value = params.user_currency
  }

  // Сохраняем origin родителя если он передан в параметрах
  if (params.parent_origin) {
    parentOrigin.value = params.parent_origin
  }

  // Определяем регион пользователя
  if (params.user_reg_geo === 'AU' || params.user_ip_geo === 'AU') {
    userRegion.value = 'au'
  } else {
    userRegion.value = 'global'
  }

  // Определяем, авторизован ли пользователь
  if (
    (params.user_reg_geo === '' || params.user_reg_geo === undefined) &&
    (params.deposit_numbers === '' || params.deposit_numbers === undefined)
  ) {
    isUserLogedIn.value = false
  } else {
    isUserLogedIn.value = true
  }
}

onMounted(async () => {
  // Загружаем данные игр из JSON
  try {
    loadedGamesData = await useGamesData()
  } catch (error) {
    console.error('Failed to load games data:', error)
    return
  }

  // Получаем игры для нужного региона
  games.value = transformGamesData(userRegion.value)

  getWatchedVideosLong()
  filterGamesByCurrency()
  removeWatchedGames()
  addFinalPopup()

  const storedLikedGames = localStorage.getItem('likedGames')
  if (storedLikedGames) {
    likedGames.value = JSON.parse(storedLikedGames)
  }

  smoothscroll.polyfill()

  // Инициализируем детекцию устройств
  detectDeviceCapabilities()

  // iOS: явно показываем оверлей до первого жеста
  if (isIOS) {
    autoplayBlocked.value = true
  }

  // Добавляем слушатели для первого пользовательского взаимодействия только на мобильных
  // где автоплей может быть заблокирован
  if (isMobileDevice.value) {
    document.addEventListener('touchstart', handleFirstUserInteraction)
    document.addEventListener('click', handleFirstUserInteraction)
    document.addEventListener('keydown', handleFirstUserInteraction)
  }

  // [DP-11241][P0] Fallback не требуется: спейсеры устраняют скачки

  scrollToTop()

  // Инициализируем время последней смены видео
  lastVideoChangeTime.value = Date.now()

  // Попробуем сохранить origin родителя при загрузке, если еще не сохранен
  if (!parentOrigin.value && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer)
      parentOrigin.value = referrerUrl.origin
    } catch (e) {
      devWarn('[DP-11241] Не удалось получить parent origin из referrer:', e)
    }
  }

  window.addEventListener('DOMContentLoaded', adjustScale)
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('resize', () => {
    screenWidth.value = window.innerWidth
    // [DP-11241][P0] Обновляем высоту элемента при ресайзе для корректных спейсеров
    itemHeight.value = window.innerHeight
  })

  // Создаем единый observer
  observer.value = new IntersectionObserver(onIntersection, observerOptions)

  // Инициализируем observer для загруженных видео
  nextTick(() => {
    videoRefs.value.forEach(video => {
      if (video && observer.value && !video.dataset.observed) {
        observer.value.observe(video)
        video.dataset.observed = 'true'
      }
    })
  })

  const finalEl = document.getElementById('final_popup')
  if (finalEl) {
    finalObserver = new IntersectionObserver(handleFinalIntersection, {
      root: null,
      threshold: 0.5,
    })
    finalObserver.observe(finalEl)
  }
  gameSlug = games.value[currentVideoIndex.value]?.game_slug
  gameName = games.value[currentVideoIndex.value]?.name
  providerSlug = games.value[currentVideoIndex.value]?.provider_slug
  providerName = games.value[currentVideoIndex.value]?.provider

  sendReelsReady(gameSlug, gameName, providerSlug, providerName)
  isPortrait = window.screen.orientation.angle === 0 || window.screen.orientation.angle === 180
  window.addEventListener('orientationchange', checkOrientation)
  // [DP-11241][P0] Обновляем высоту элемента при смене ориентации для корректных спейсеров
  window.addEventListener('orientationchange', () => {
    itemHeight.value = window.innerHeight
  })

  // Добавляем слушатель для автоматического воспроизведения при возвращении на вкладку
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Периодическая проверка памяти на мобильных устройствах
  if (isMobileDevice.value || isLowPowerMode.value) {
    memoryCheckInterval.value = window.setInterval(checkMemoryUsage, 30000) // Проверяем каждые 30 секунд
  }
})

onUnmounted(() => {
  // Очищаем слушатель прогресса
  removeVideoProgressListener()

  // Очищаем все таймеры
  if (unloadTimeout.value) {
    clearTimeout(unloadTimeout.value)
  }
  if (memoryCheckInterval.value) {
    window.clearInterval(memoryCheckInterval.value)
  }
  if (intersectionTimeout) {
    clearTimeout(intersectionTimeout)
  }

  // Очищаем слушатели пользовательского взаимодействия
  document.removeEventListener('touchstart', handleFirstUserInteraction)
  document.removeEventListener('click', handleFirstUserInteraction)
  document.removeEventListener('keydown', handleFirstUserInteraction)

  // Очищаем состояние воспроизведения
  playAttempts.value.clear()
  pendingPlayPromises.value.clear()

  // Очищаем observers
  if (observer.value) {
    videoRefs.value.forEach(video => {
      if (video) {
        observer.value!.unobserve(video)
        delete video.dataset.observed
      }
    })
    observer.value.disconnect()
    observer.value = null
  }

  if (finalObserver) {
    finalObserver.disconnect()
    finalObserver = null
  }

  // Очищаем все видео refs
  videoRefs.value.forEach(video => {
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  })
  videoRefs.value = []

  // Удаляем слушатели событий
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('resize', () => {
    screenWidth.value = window.innerWidth
  })
  window.removeEventListener('orientationchange', checkOrientation)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Обнуляем ссылки
  currentVideo.value = null
})
</script>

<style lang="scss">
@import './styles.scss';
</style>
