<template>
  <div class="game_info_container" :class="{ 'no-background': props.externalLink }">
    //
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

    <!--
  Рендер промо-блока: компонент выбирается по localeKey через promoRegistry.
  Если localeKey не найден, используется DefaultPromo.
-->
    <component
      v-else-if="promoConfig"
      :is="promoConfig.component"
      :external-link="props.externalLink"
      :prize-label="$t(promoConfig.prizeKey)"
      :description="$t(promoConfig.descriptionKey)"
      :cta-label="$t(promoConfig.ctaKey)"
      @go-to-external-link="$emit('go-to-external-link', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WinterPromo from './WinterPromo.vue'
import DefaultPromo from './DefaultPromo.vue'
// import SummerPromo from './SummerPromo.vue' // Пример добавления нового промо-компонента

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

interface PromoConfig {
  component: any
  prizeKey: string
  descriptionKey: string
  ctaKey: string
}

const props = defineProps<GameInfoProps>()

const isDemoDisabled = computed(() => Boolean(props.noDemo))

const promoRegistry: Record<string, PromoConfig> = {
  winter_promo: {
    component: WinterPromo,
    prizeKey: 'winter_promo_link_prize',
    descriptionKey: 'winter_promo_description',
    ctaKey: 'winter_promo_link_text',
  },
  default: {
    component: DefaultPromo,
    prizeKey: 'external_link_prize',
    descriptionKey: 'external_link_description',
    ctaKey: 'external_link_button',
  },
  // Пример добавления нового промо-компонента
  // summer_promo: {
  //   component: SummerPromo,
  //   prizeKey: 'summer_promo_link_prize',
  //   descriptionKey: 'summer_promo_description',
  //   ctaKey: 'summer_promo_link_text',
  // },
}

const promoConfig = computed(() => {
  if (!props.externalLink) {
    return null
  }

  return promoRegistry[props.externalLink.localeKey] ?? promoRegistry.default
})
</script>
