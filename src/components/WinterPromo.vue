<template>
  <div class="promo_container" :class="{ promo_fullscreen: props.showVideo && props.gameId }">
    <img
      v-if="props.showVideo && props.gameId"
      :src="getPosterPath(props.videoSrc)"
      class="promo_poster"
      alt="poster"
    />

    <video
      v-if="props.showVideo && props.gameId"
      ref="promoVideoRef"
      class="promo_video"
      :poster="getPosterPath(props.videoSrc)"
      preload="metadata"
      :muted="!props.soundOn"
      loop
      playsinline
      autoplay
    >
      <source :src="`/video/webm/${props.videoSrc}.webm?3`" type="video/webm" />
      <source :src="`/video/h264/${props.videoSrc}.mp4?3`" type="video/mp4" />
    </video>

    <div class="promo_content">
      <div class="promo_prize_amount">
        <img
          src="/promo/winter_promo/prize_plate.webp"
          alt="Prize plate"
          class="promo_prize_plate"
        />
        <div class="promo_prize_text">
          {{ $t('winter_promo_link_prize') }}
        </div>
      </div>

      <div class="promo_description">{{ $t('winter_promo_description') }}</div>

      <a @click="handleButtonClick" class="promo_button">
        <div class="promo_button_text">{{ $t('winter_promo_link_text') }}</div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface WinterPromoProps {
  externalLink: {
    url: string
    localeKey: string
  }
  videoSrc?: string
  soundOn?: boolean
  showVideo?: boolean
  gameId?: string
}

interface WinterPromoEmits {
  (e: 'go-to-external-link', url: string): void
}

const props = withDefaults(defineProps<WinterPromoProps>(), {
  videoSrc: 'winter_promo',
  soundOn: false,
  showVideo: false,
})

const emit = defineEmits<WinterPromoEmits>()

const promoVideoRef = ref<HTMLVideoElement | null>(null)

function getPosterPath(src: string): string {
  return `/video/posters/${src}.webp`
}

function handleButtonClick(): void {
  emit('go-to-external-link', props.externalLink.url)
}

// Безопасная функция для воспроизведения видео
async function safePlay(video: HTMLVideoElement) {
  // Проверяем, не прерван ли уже запрос на воспроизведение
  if (video.paused) {
    try {
      await video.play()
    } catch (error) {
      // Игнорируем ошибки, если play() был прерван
      if ((error as DOMException).name !== 'AbortError') {
        console.error('Ошибка воспроизведения промо-видео:', error)
      }
    }
  }
}

// Синхронизация звука только если есть видео
watch(
  () => props.soundOn,
  async newValue => {
    const video = promoVideoRef.value
    if (props.showVideo && video) {
      video.muted = !newValue
      // Если звук включили и видео на паузе, пытаемся запустить
      if (newValue && video.paused) {
        await safePlay(video)
      }
    }
  }
)

onMounted(() => {
  const video = promoVideoRef.value
  if (props.showVideo && video) {
    // Устанавливаем начальное состояние звука
    video.muted = !props.soundOn
    // Запускаем воспроизведение
    safePlay(video)
  }
})

onUnmounted(() => {
  const video = promoVideoRef.value
  if (video) {
    // Останавливаем видео и сбрасываем источники, чтобы освободить память
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
})
</script>

<style scoped lang="scss">
.promo_container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  pointer-events: none;

  // Полноэкранное промо с видео (телепортировано в контейнер игры) чтобы не было резскго
  // появлени и исчезновения при изменении контента в gameInfo
  &.promo_fullscreen {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  // Нижняя плашка без видео
  &:not(.promo_fullscreen) {
    height: auto;
    padding-bottom: 2vh;
  }
}

// Стили для видео (только если fullscreen)
.promo_poster,
.promo_video {
  display: none;
}

.promo_fullscreen .promo_poster,
.promo_fullscreen .promo_video {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  z-index: 1;
}

.promo_fullscreen .promo_video {
  z-index: 2;
}

.promo_content {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 3.65vh;
  pointer-events: auto;
  z-index: 10;

  .promo_fullscreen & {
    position: absolute;
    bottom: 0;
    left: 0;
  }
}

.promo_description {
  text-align: center;
  color: #fafafa;
  font-family: 'Sora', system-ui;
  font-weight: 800;
  font-size: 5.3vh;
  line-height: 1.2;
  text-shadow: rgba(0, 0, 0, 0.8) 0px 12.615px 5.046px;
  margin-bottom: 3.2vh;
  pointer-events: none;
  user-select: none;

  @media (max-width: 768px) {
    font-size: 4.8vh;
  }
}

.promo_prize_amount {
  position: relative;
  width: 43vh;
  margin: 0 auto -13.6px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  transform: rotate(0.159deg);

  @media (max-width: 768px) {
    margin: 0 auto -1vh;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-65%);
    width: 84%;
    height: 50%;
    background-image: url('/promo/winter_promo/snow.svg');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: bottom;
    pointer-events: none;
  }
}

.promo_prize_plate {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

.promo_prize_text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Sora', system-ui;
  font-weight: 800;
  font-size: 6.3vw;
  color: #ffffff;
  text-align: center;
  white-space: pre;
  letter-spacing: 0.5px;
  pointer-events: none;
  user-select: none;

  @media (max-width: 768px) {
    font-size: 4.3vh;
  }
}

.promo_button {
  width: 91%;
  cursor: pointer;
  pointer-events: auto;
  text-decoration: none;
}

.promo_button_text {
  position: relative;
  padding: 1.2dvh 0;
  background: #00eda6;
  color: #110e1b;
  font-family: 'Sora', system-ui;
  font-weight: 700;
  font-size: 2.53vh;
  line-height: normal;
  border-radius: 69.887px;
  text-align: center;
  white-space: pre;
  transition: all 0.3s ease;
  overflow: hidden;
  animation: glow 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      rgba(255, 255, 255, 0.8) 50%,
      transparent 60%
    );
    filter: blur(3px);
    transform: rotate(45deg);
    animation: shine 5s ease-in-out infinite;
    opacity: 0;
  }

  &:hover {
    transform: scale(1.02);
    background: #01d394;
  }

  @media (max-width: 768px) {
    padding: 1.33dvh 0;
  }
}

@keyframes glow {
  0% {
    filter: drop-shadow(0 0 1px #00eda6);
  }
  50% {
    filter: drop-shadow(0 0 6px #00eda6);
  }
  100% {
    filter: drop-shadow(0 0 1px #00eda6);
  }
}

@keyframes shine {
  0% {
    opacity: 0;
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  20% {
    opacity: 0.6;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

@media (max-width: 768px) {
  .promo_content {
    padding-bottom: 3.8dvh;
  }
}
</style>
