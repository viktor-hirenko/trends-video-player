<template>
  <div class="promo_content">
    <div class="promo_prize_amount">
      <img
        src="/promo/winter_promo/prize_plate.webp"
        alt="Winter promo prize plate"
        class="promo_prize_plate"
      />
      <div class="promo_prize_text">
        {{ prizeLabel }}
      </div>
    </div>

    <div class="promo_description">{{ description }}</div>

    <a class="promo_button" @click="handleClick">
      <div class="promo_button_text">{{ ctaLabel }}</div>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface WinterPromoProps {
  externalLink: {
    url: string
    localeKey: string
  }
  prizeLabel: string
  description: string
  ctaLabel: string
  link?: string
}

const props = defineProps<WinterPromoProps>()

const emit = defineEmits<{
  (event: 'go-to-external-link', url: string): void
}>()

const ctaHref = computed(() => props.link ?? '#')

function handleClick(): void {
  emit('go-to-external-link', props.externalLink.url)
}
</script>

<style scoped lang="scss">
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
  font-size: 4.3vh;
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
