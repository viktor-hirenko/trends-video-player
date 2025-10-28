<template>
  <div class="desktop_wrapper">
    <div id="video_area" class="video_area">
      <div ref="videos_container" class="videos_container">
        <div
          v-for="(game, index) in games"
          :key="game.game_slug"
          :id="game.game_slug"
          class="video_screen"
          :class="{
            'autoplay-blocked': isOverlayActive(index),
          }"
        >
          <img
            :src="getPosterPath(game.src)"
            v-if="shouldLoadMedia(index) && game.game_slug !== 'final_popup'"
            class="poster"
            alt="poster"
          />

          <video
            v-if="game.game_slug !== 'final_popup'"
            class="video_screen_item"
            :preload="shouldLoadSources(index) ? 'metadata' : 'none'"
            muted
            loop
            playsinline
            :poster="shouldLoadMedia(index) ? getPosterPath(game.src) : ''"
            :ref="(el) => setVideoRef(el as HTMLVideoElement, index)"
          >
            <source
              v-if="shouldLoadSources(index)"
              :src="`/video/webm/${game.src}.webm?3`"
              type="video/webm"
            />
            <source
              v-if="shouldLoadSources(index)"
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
              v-if="showPlayIcon && currentVideoIndex === index && shouldLoadMedia(index)"
              id="play_icon"
              class="media_state_icons"
              src="/icons/play.svg"
              alt=""
            />
          </transition>
          <transition name="fade">
            <img
              v-if="showPauseIcon && currentVideoIndex === index && shouldLoadMedia(index)"
              id="pause_icon"
              class="media_state_icons"
              src="/icons/pause.svg"
              alt="pause_icon"
            />
          </transition>
          <transition name="fade">
            <img
              v-if="showSoundOnIcon && currentVideoIndex === index && shouldLoadMedia(index)"
              id="sound_on_icon"
              class="media_state_icons"
              src="/icons/sound_on.svg"
              alt=""
            />
          </transition>
          <transition name="fade">
            <img
              v-if="showSoundOffIcon && currentVideoIndex === index && shouldLoadMedia(index)"
              id="sound_off_icon"
              class="media_state_icons"
              src="/icons/sound_off.svg"
              alt=""
            />
          </transition>

          <!-- Большая кнопка воспроизведения для заблокированного автоплея -->
          <div
            v-if="isOverlayActive(index)"
            @pointerdown="unlockAndPlay($event, index)"
            class="autoplay_blocked_overlay"
          >
            <img src="/icons/play.svg" alt="Запустить видео" class="autoplay_blocked_play_icon" />
          </div>

          <div v-if="game.game_slug !== 'final_popup'">
            <img
              v-if="!isOverlayActive(index)"
              class="gradient"
              src="/icons/gradient.svg"
              alt=""
              @click="toggleVideoPause($event)"
            />
            <img
              @click="toggleSound($event)"
              class="sound_icon"
              :src="soundOn ? './icons/sound.svg' : './icons/sound_off.svg'"
              alt="sound_button"
            />
            <img
              v-if="game.game_slug !== 'final_popup'"
              @click="toggleLike(game.game_slug, $event)"
              class="like_icon"
              :src="isLiked(game.game_slug) ? './icons/like_on.svg' : './icons/like_off.svg'"
              alt="like_button"
            />
          </div>
          <div
            class="progress_bg"
            v-if="game.game_slug !== 'final_popup' && shouldLoadMedia(index)"
          ></div>
          <div
            class="progress_bar"
            :style="{ width: videoProgress + '%' }"
            v-if="game.game_slug !== 'final_popup' && shouldLoadMedia(index)"
          ></div>
        </div>
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
// Энергосбережение: true, если включён Data Saver/медленное соединение; влияет на агрессивность загрузки/очистки медиа
const isLowPowerMode = ref<boolean>(false)
const canAutoplay = ref<boolean>(true)
const playAttempts = ref<Map<number, number>>(new Map())
const pendingPlayPromises = ref<Set<number>>(new Set())
const primedVideoIndexes = new Set<number>()
const blockedByVideo = ref<Record<string, boolean>>({})
const mediaUnlocked = ref<boolean>(false) // до первого реального тапа

// Переменная для interval мониторинга памяти
const memoryCheckInterval = ref<number | null>(null)

// Флаг для предотвращения конфликтов при воспроизведении
const isPlaybackOperationInProgress = ref<boolean>(false)

// Переменная для отслеживания заблокированного автоплея
const autoplayBlocked = ref<boolean>(false)

// Переменные для управления памятью
const loadedMediaRange = ref<{ start: number; end: number }>({ start: 0, end: 2 })

// Активная игра для фиксированной панели GameInfo
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

  // Детект энергосбережения через Network Information API (saveData/effectiveType):
  // используем как сигнал «слабое устройство/сеть» для снижения памяти и числа одновременно загруженных видео
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
      markVideoAsPrimed(videoIndex)
      setVideoBlockedState(videoIndex, false)
      playAttempts.value.delete(videoIndex) // Сбрасываем счетчик при успехе

      // Если автоплей сработал, сбрасываем флаг блокировки
      if (autoplayBlocked.value) {
        autoplayBlocked.value = false
        canAutoplay.value = true
      }

      return true
    }

    return false
  } catch (error) {
    console.error('Ошибка воспроизведения видео (автоплей заблокирован):', error)

    // Увеличиваем счетчик попыток
    playAttempts.value.set(videoIndex, currentAttempts + 1)

    // Устанавливаем флаги блокировки автоплея
    autoplayBlocked.value = true
    canAutoplay.value = false
    setVideoBlockedState(videoIndex, true)

    // Если превышено количество попыток, окончательно отключаем автоплей
    if (currentAttempts >= maxAttempts) {
      console.warn('Превышено количество попыток автоплея, окончательно отключаем')
    }

    return false
  } finally {
    pendingPlayPromises.value.delete(videoIndex)
  }
}

function getActiveVideo(): HTMLVideoElement | null {
  return currentVideo.value || videoRefs.value[currentVideoIndex.value] || null
}

async function unlockAndPlay(event?: Event, idx?: number): Promise<void> {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }

  // Разблокируем медиадоступ и даём Vue дорендерить <source> для текущего индекса
  mediaUnlocked.value = true
  await nextTick()

  const index = typeof idx === 'number' ? idx : currentVideoIndex.value
  const video = videoRefs.value[index] || getActiveVideo()
  if (!video) return

  // Подстрахуемся: корректно выставим mute в соответствии со state
  video.muted = !soundOn.value

  const tryPlay = async () => {
    try {
      const p = video.play()
      if (p !== undefined) await p
      markVideoAsPrimed(index)
      setVideoBlockedState(index, false)
      autoplayBlocked.value = false
      wasManuallyPaused.value = false
      showPlayIcon.value = true
      setTimeout(() => (showPlayIcon.value = false), 300)
      sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
    } catch (e) {
      // Если первый вызов play() не прошёл — оставляем флаг блокировки,
      // но ниже подпишемся на loadeddata и перезапустим автоматически.
      autoplayBlocked.value = true
      setVideoBlockedState(index, true)
    }
  }

  // Если данные ещё не готовы — подхватываемся на loadeddata и играем без второго тапа
  if (video.readyState < 2) {
    const onReady = async () => {
      video.removeEventListener('loadeddata', onReady)
      await tryPlay()
    }
    // Страхуемся на случай, если браузер капризничает
    video.addEventListener('loadeddata', onReady, { once: true })
    // Явно триггерим загрузку (иногда помогает на Safari/LPM)
    try {
      video.load()
    } catch {}

    // Попытка немедленного старта (если браузер разрешит — сыграет сразу)
    await tryPlay()
  } else {
    // Уже готово — просто играем
    await tryPlay()
  }
}

function markVideoAsPrimed(videoIndex: number): void {
  if (videoIndex >= 0) {
    primedVideoIndexes.add(videoIndex)
  }
}

function hasVideoBeenPrimed(videoIndex: number): boolean {
  return primedVideoIndexes.has(videoIndex)
}

function setVideoBlockedState(index: number, blocked: boolean): void {
  if (index < 0) {
    return
  }

  const key = index.toString()
  const currentState = blockedByVideo.value

  if (blocked) {
    if (!currentState[key]) {
      blockedByVideo.value = { ...currentState, [key]: true }
    }
  } else if (currentState[key]) {
    const { [key]: _removed, ...rest } = currentState
    blockedByVideo.value = rest
  }
}

function isVideoBlocked(index: number): boolean {
  return !!blockedByVideo.value[index.toString()]
}

function primeVideoForPlayback(video: HTMLVideoElement | null, videoIndex: number): void {
  if (!video || hasVideoBeenPrimed(videoIndex)) {
    return
  }

  const previousMuted = video.muted

  try {
    video.muted = true
    const playPromise = video.play()

    if (playPromise !== undefined) {
      void playPromise
        .then(() => {
          markVideoAsPrimed(videoIndex)
          video.pause()
          try {
            video.currentTime = 0
          } catch (err) {
            console.warn('Не удалось сбросить время видео после прайминга:', err)
          }
        })
        .catch(error => {
          console.warn('Ошибка прайминга видео:', error)
        })
        .finally(() => {
          video.muted = previousMuted
        })
    } else {
      markVideoAsPrimed(videoIndex)
      video.pause()
      try {
        video.currentTime = 0
      } catch (err) {
        console.warn('Не удалось сбросить время видео после прайминга:', err)
      }
      video.muted = previousMuted
    }
  } catch (error) {
    console.warn('Не удалось праймить видео:', error)
    video.muted = previousMuted
  }
}

/**
 * Обработчик первого пользовательского взаимодействия
 */
async function handleFirstUserInteraction(event?: Event): Promise<void> {
  if (isPlaybackOperationInProgress.value) {
    return
  }

  isPlaybackOperationInProgress.value = true

  userHasInteracted.value = true

  document.removeEventListener('touchstart', handleFirstUserInteraction)
  document.removeEventListener('click', handleFirstUserInteraction)
  document.removeEventListener('keydown', handleFirstUserInteraction)

  const activeVideo = getActiveVideo()
  const activeVideoIndex = activeVideo ? videoRefs.value.indexOf(activeVideo) : -1

  videoRefs.value.forEach((video, index) => {
    if (!video) {
      return
    }

    if (index !== activeVideoIndex) {
      primeVideoForPlayback(video, index)
    }
  })

  if (activeVideo && activeVideo.paused) {
    const launchIndex = activeVideoIndex !== -1 ? activeVideoIndex : currentVideoIndex.value

    try {
      const success = await safeVideoPlay(activeVideo, launchIndex, false)

      if (!success) {
        await activeVideo.play()
        markVideoAsPrimed(launchIndex)
        setVideoBlockedState(launchIndex, false)
      }

      console.log('Видео успешно запущено после пользовательского взаимодействия')
      autoplayBlocked.value = false
      canAutoplay.value = true
      setVideoBlockedState(launchIndex, false)
      wasManuallyPaused.value = false
      showPlayIcon.value = true
      setTimeout(() => (showPlayIcon.value = false), 300)
      sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
    } catch (error) {
      console.error('Ошибка запуска видео после взаимодействия:', error)
      autoplayBlocked.value = true
      canAutoplay.value = false
      setVideoBlockedState(launchIndex, true)
    } finally {
      isPlaybackOperationInProgress.value = false
    }
  } else {
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

async function ensureGestureThen(action: () => void, event?: Event, idx?: number): Promise<void> {
  if (!mediaUnlocked.value) {
    await unlockAndPlay(event, typeof idx === 'number' ? idx : currentVideoIndex.value)
    await nextTick()
  }
  action()
}

async function toggleSound(event?: Event): Promise<void> {
  await ensureGestureThen(() => {
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
  }, event)
}

function isLiked(gameSlug: string): boolean {
  return likedGames.value.includes(gameSlug)
}

async function toggleLike(gameSlug: string, event?: Event): Promise<void> {
  await ensureGestureThen(() => {
    const index = likedGames.value.indexOf(gameSlug)
    if (index !== -1) {
      likedGames.value.splice(index, 1)
    } else {
      likedGames.value.push(gameSlug)
      sendReelsLikedGame(gameSlug, gameName, providerSlug, providerName)
    }
    localStorage.setItem('likedGames', JSON.stringify(likedGames.value))
  }, event)
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
    console.log('Не удается получить parent origin через window.parent:', e)
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
  rootMargin: '0px',
  threshold: 0.7,
}

let finalObserver: IntersectionObserver | null = null

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
  return index >= loadedMediaRange.value.start && index <= loadedMediaRange.value.end
}

/**
 * Определяет, нужно ли загружать источники видео для данного индекса
 */
function shouldLoadSources(index: number): boolean {
  const range = 1
  return Math.abs(index - currentVideoIndex.value) <= range
}

function isOverlayActive(index: number): boolean {
  const video = videoRefs.value[index]
  const paused = !video || video.paused

  // Показываем оверлей если:
  // 1) медиа ещё не разблокированы (нет первого тапа) - ТОЛЬКО в энергосбережении
  // 2) либо реально заблокирован автоплей
  return (
    currentVideoIndex.value === index &&
    shouldLoadMedia(index) &&
    ((isLowPowerMode.value && !mediaUnlocked.value) || (paused && (isVideoBlocked(index) || autoplayBlocked.value)))
  )
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
  // В энергосбережении/на мобиле держим в DOM и с источниками только ближайшие ролики (окно = 1) для экономии ОЗУ/IO
  const mediaRange = isMobileDevice.value || isLowPowerMode.value ? 1 : 2
  const currentIndex = currentVideoIndex.value

  // Обновляем диапазон загружаемых медиа
  loadedMediaRange.value = {
    start: Math.max(0, currentIndex - mediaRange),
    end: Math.min(games.value.length - 1, currentIndex + mediaRange),
  }

  // Выгружаем видео, которые находятся вне диапазона
  videoRefs.value.forEach((video, index) => {
    if (video && Math.abs(index - currentIndex) > mediaRange) {
      // Останавливаем воспроизведение и очищаем источники
      video.pause()
      video.removeAttribute('src')
      video.removeAttribute('poster')

      // На слабых профилях не только убираем poster/src, но и «обезжириваем» <source> + preload,
      // чтобы браузер не держал лишние дескрипторы/буфер
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
  // Агрессивная защита от переполнения памяти на слабых устройствах:
  // при >80% heap — вычищаем «неактивные» видео/источники, отписываем из observer, занижаем preload
  if ('memory' in performance) {
    const memInfo = (performance as any).memory
    const memoryUsageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit

    // Порог 80%: баланс между ранней профилактикой фризов и лишними перезагрузками источников
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
function updateMediaRange(): void {
  // Отменяем предыдущий таймер
  if (unloadTimeout.value) {
    clearTimeout(unloadTimeout.value)
  }

  // При энергосбережении сразу проверяем память перед отложенной выгрузкой — быстрее сбрасываем «далёкие» видео
  if (isMobileDevice.value || isLowPowerMode.value) {
    checkMemoryUsage()
  }

  // Запускаем отложенную выгрузку
  unloadTimeout.value = window.setTimeout(() => {
    debouncedUnloadVideos()

    // Повторная проверка памяти после выгрузки: сглаживаем пики использования буфера на слабых девайсах
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
  entries.forEach(entry => {
    const video = entry.target as HTMLVideoElement
    const container = video.closest('.video_screen') as HTMLElement | null
    if (!container) return

    const gameSlug1 = container.id
    const game = games.value.find(g => g.game_slug === gameSlug1)
    const videoIndex = games.value.findIndex(g => g.game_slug === gameSlug1)

    if (entry.isIntersecting) {
      // Останавливаем предыдущее видео если оно играет
      if (currentVideo.value && currentVideo.value !== video && !currentVideo.value.paused) {
        currentVideo.value.pause()
      }

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

      // Если жеста ещё не было — не автозапускаем ТОЛЬКО в энергосбережении
      if (isLowPowerMode.value && !mediaUnlocked.value) {
        video.pause()
        video.style.opacity = '1'
        return
      }

      // Безопасно пытаемся запустить видео
      if (videoIndex !== -1) {
        void safeVideoPlay(video, videoIndex).then(success => {
          if (success) {
            // Отправляем аналитическое событие только при успешном запуске
            setTimeout(() => {
              if (!orientationChanged.value) {
                sendReelsCurrentVideo(gameSlug, gameName, providerSlug, providerName)
              }
            }, 300)
          } else {
            console.log('Автоплей заблокирован - видео готово к ручному запуску')
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
    const active = getActiveVideo()
    if (!autoplayBlocked.value && (!active || !active.paused)) {
      isPlaybackOperationInProgress.value = false
      return
    }
  }

  isPlaybackOperationInProgress.value = true

  const activeVideo = getActiveVideo()

  if (activeVideo) {
    const videoIndex = videoRefs.value.indexOf(activeVideo)

    if (activeVideo.paused) {
      // Пытаемся запустить видео безопасно без сброса времени воспроизведения
      if (videoIndex !== -1) {
        void safeVideoPlay(activeVideo, videoIndex, false)
          .then(success => {
            if (success) {
              setVideoBlockedState(videoIndex, false)
              autoplayBlocked.value = false
              canAutoplay.value = true
              wasManuallyPaused.value = false
              showPlayIcon.value = true
              setTimeout(() => (showPlayIcon.value = false), 300)
              sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
            } else {
              // Если автоплей не сработал, пробуем напрямую
              void activeVideo
                .play()
                .then(() => {
                  setVideoBlockedState(videoIndex, false)
                  autoplayBlocked.value = false
                  canAutoplay.value = true
                  wasManuallyPaused.value = false
                  showPlayIcon.value = true
                  setTimeout(() => (showPlayIcon.value = false), 300)
                  sendReelsPlay(gameSlug, gameName, providerSlug, providerName)
                })
                .catch(error => {
                  console.error(error)
                  autoplayBlocked.value = true
                  canAutoplay.value = false
                  setVideoBlockedState(videoIndex, true)
                })
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
      activeVideo.pause()
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
  blockedByVideo.value = {}
  primedVideoIndexes.clear()

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

  // Гейт жеста включаем только в энергосбережении
  mediaUnlocked.value = !isLowPowerMode.value

  // Добавляем слушатели для первого пользовательского взаимодействия только на мобильных
  // где автоплей может быть заблокирован
  if (isMobileDevice.value) {
    document.addEventListener('touchstart', handleFirstUserInteraction)
    document.addEventListener('click', handleFirstUserInteraction)
    document.addEventListener('keydown', handleFirstUserInteraction)
  }

  scrollToTop()

  // Инициализируем время последней смены видео
  lastVideoChangeTime.value = Date.now()

  // Попробуем сохранить origin родителя при загрузке, если еще не сохранен
  if (!parentOrigin.value && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer)
      parentOrigin.value = referrerUrl.origin
    } catch (e) {
      console.log('Не удалось получить parent origin из referrer:', e)
    }
  }

  window.addEventListener('DOMContentLoaded', adjustScale)
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('resize', () => {
    screenWidth.value = window.innerWidth
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

  // Добавляем слушатель для автоматического воспроизведения при возвращении на вкладку
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Фоновый монитор памяти раз в 30с включаем только при энергосбережении/мобиле, чтобы не тратить ресурсы на десктопе
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
  blockedByVideo.value = {}
  primedVideoIndexes.clear()

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
