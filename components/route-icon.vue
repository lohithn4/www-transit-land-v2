<template>
  <div class="route-icon">
    <span class="route-icon-icon">
      <b-icon v-if="routeType == 0" icon="tram" />
      <b-icon v-else-if="routeType == 1" icon="subway" />
      <b-icon v-else-if="routeType == 2" icon="train" />
      <b-icon v-else-if="routeType == 3" icon="bus" />
      <b-icon v-else-if="routeType == 4" icon="ferry" />
    </span>
    <span v-if="routeShortName" class="route-icon-short-name">
      {{ routeShortName }}
    </span>
    <span v-if="routeLongName" class="route-icon-long-name">
      {{ routeLongName }}
    </span>
  </div>
</template>

<script>
export default {
  props: {
    routeType: {
      type: Number,
      default: null
    },
    routeShortName: {
      type: String,
      default: null
    },
    routeLongName: {
      type: String,
      default: null
    },
    routeLink: {
      type: String,
      default: null
    }
  }
}
</script>
