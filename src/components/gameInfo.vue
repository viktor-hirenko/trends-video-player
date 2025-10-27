<template>
  <div class="game_info_container" :class="{ 'no-background': props.externalLink }">
    <!-- Стандартные элементы отображаются только если нет external_link -->
    <template v-if="!props.externalLink">
      <img class="game_info_thumb" :src="props.thumb" alt="" />
      <div class="game_text_column">
        <div class="game_name">{{ props.name }}</div>
        <a @click="$emit('go-to-provider', props.provider_link)">
          <div class="game_provider">{{ props.provider }}</div>
        </a>
      </div>
      <a v-if="!isDemoDisabled || props.isUserLogedIn" @click="$emit('play-game', props.gameId)">
        <div class="game_play_button">{{ buttonText }}</div>
      </a>
      <a
        v-else
        @click="
          $emit(
            'go-to-external-link',
            '/registration?utm_source=site&utm_medium=reels&utm_campaign=trends'
          )
        "
      >
        <div class="game_play_button">{{ signUpButton }}</div>
      </a>
    </template>

    <!-- Новая кнопка внизу экрана для external_link -->
    <div v-if="props.externalLink" class="external_link_container">
      <div class="external_link_prize_text">
        <div class="prize_amount">{{ $t('external_link_prize') }}</div>
        <div class="prize_description">{{ $t('external_link_description') }}</div>
      </div>
      <a @click="$emit('go-to-external-link', props.externalLink.url)" class="external_link_button">
        <div class="external_link_btn">{{ $t(props.externalLink.localeKey) }}</div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface GameInfoProps {
  thumb: string
  provider_link: string
  name: string
  provider: string
  gameId: string
  buttonText: string
  noDemo?: boolean
  isUserLogedIn: boolean
  signUpButton: string
  externalLink?: {
    url: string
    localeKey: string
  }
}

const props = defineProps<GameInfoProps>()

// Вычисляемое свойство для проверки, отключен ли демо-режим
const isDemoDisabled = computed(() => {
  // Используем нестрогую проверку для поддержки разных типов
  return Boolean(props.noDemo)
})
</script>
