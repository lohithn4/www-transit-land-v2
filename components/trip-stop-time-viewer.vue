<template>
  <div>
    <b-message v-if="error" class="is-danger">
      {{ error }}
    </b-message>
    <span v-else-if="$apollo.loading" class="is-loading">Loading</span>
    <b-table
      v-else
      :data="sts"
      :striped="true"
      sort-icon="menu-up"
      :default-sort="defaultSort"
    >
      <b-table-column
        v-slot="props"
        :sortable="true"
        field="departure_time"
        label="Time"
        width="180"
        numeric
      >
        <span v-if="props.row.departure_time - props.row.arrival_time > 60">
          {{ props.row.arrival_time | formatHMS }} / {{ props.row.departure_time | formatHMS }}
        </span>
        <span v-else>
          {{ props.row.departure_time | formatHMS }}
        </span>
      </b-table-column>
      <b-table-column v-slot="props" :sortable="true" field="stop_name" label="Stop">
        <nuxt-link :to="{name: 'feeds-feed-versions-version-stops-stop', params:{feed:$route.params.feed, version:$route.params.version, stop:props.row.stop.stop_id}}">
          {{ props.row.stop.stop_name }}
        </nuxt-link>
      </b-table-column>
    </b-table>
  </div>
</template>
    </b-table>
  </div>
</template>

<script>
import gql from 'graphql-tag'

const q = gql`
query ($feed_version_id: bigint!, $trip_id: String) {
  trips: gtfs_trips(limit: 1, where: {trip_id: {_eq: $trip_id}, feed_version_id: {_eq: $feed_version_id}}) {
    id
    trip_id
    stop_times {
      id
      arrival_time
      departure_time
      stop {
        id
        stop_name
        stop_id
      }
    }
  }
}
`

export default {
  props: {
    fvid: { type: Number, default: null },
    tripId: { type: String, default: '' },
    serviceDate: { type: String, default: null },
    routeId: { type: Number, default: null }
  },
  data () {
    return {
      trips: [],
      defaultSort: ['departure_time', 'asc'],
      error: null
    }
  },
  computed: {
    sts () {
      const ret = []
      if (this.trips.length === 0) {
        return ret
      }
      for (const st of (this.trips[0].stop_times || [])) {
        ret.push(st)
      }
      return ret.sort((a, b) => { return a.departure_time - b.departure_time })
    }
  },
  apollo: {
    trips: {
      query: q,
      error (e) { this.error = e },
      variables () {
        return {
          feed_version_id: this.fvid,
          trip_id: this.tripId
        }
      }
    }
  }
}
</script>
