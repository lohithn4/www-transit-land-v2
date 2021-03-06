<template>
  <div>
    <b-message v-if="error" class="is-danger">
      {{ error }}
    </b-message>

    <b-field grouped group-multiline>
      <b-field label="Filter by Fetch Status">
        <b-select v-model="fetchErrorFilter">
          <option value="all">
            Show all feeds
          </option>
          <option value="ok">
            Show feeds without errors
          </option>
          <option value="error">
            Show feeds with errors
          </option>
        </b-select>
      </b-field>

      <b-field label="Filter by Feed Specification" class="pl-3">
        <div class="pt-2">
          <b-checkbox v-model="feedSpecs" native-value="gtfs" class="is-medium">
            <abbr title="General Transit Feed Specification">GTFS</abbr>
          </b-checkbox>
          <b-checkbox v-model="feedSpecs" native-value="gtfs-rt" class="is-medium">
            <abbr title="GTFS Realtime">GTFS-RT</abbr>
          </b-checkbox>
          <b-checkbox v-model="feedSpecs" native-value="gbfs" class="is-medium">
            <abbr title="General Bikeshare Feed Specification">GBFS</abbr>
          </b-checkbox>
          <b-checkbox v-model="feedSpecs" native-value="mds" class="is-medium">
            <abbr title="Mobility Data Specification">MDS</abbr>
          </b-checkbox>
        </div>
      </b-field>
    </b-field>

    <b-table
      class="pt-3"
      :loading="$apollo.loading"
      :data="feedPage"
      :striped="true"
      :paginated="true"
      sort-icon="menu-up"
      :total="total"
      backend-pagination
      backend-sorting
      backend-filtering
      @page-change="onPageChange"
      @sort="onSort"
    >
      <b-table-column v-slot="props" field="onestop_id" label="Feed Onestop ID">
        <nuxt-link :to="{name: 'feeds-feed', params: {feed: props.row.onestop_id}}">
          {{ props.row.onestop_id }}
        </nuxt-link>
      </b-table-column>

      <b-table-column v-slot="props" field="spec" label="Specification">
        {{ props.row.spec.toUpperCase() }}
      </b-table-column>

      <b-table-column v-slot="props" numeric field="feed_version_count" label="# of Versions Archived">
        <span v-if="props.row.spec === 'gtfs'">
          {{ props.row.feed_version_count }}
        </span>
      </b-table-column>

      <b-table-column v-slot="props" field="last_successful_fetch_at" label="Last Fetched">
        <span v-if="props.row.spec === 'gtfs'">
          <template v-if="props.row.last_successful_fetch_at">
            {{ props.row.last_successful_fetch_at | fromNow }}
          </template>
          <template v-else>
            Never
          </template>
        </span>
      </b-table-column>

      <b-table-column v-slot="props" field="last_successful_import_at" label="Last Imported">
        <span v-if="props.row.spec === 'gtfs'">
          <template v-if="props.row.last_successful_import_at">
            {{ props.row.last_successful_import_at | fromNow }}
          </template>
          <template v-else>
            Never
          </template>
        </span>
      </b-table-column>

      <template v-if="fetchErrorFilter !== 'ok'">
        <b-table-column v-slot="props" field="last_fetch_error" label="Fetch Errors">
          <code v-if="fetchErrorFilter == 'error'" class="is-danger">
            {{ props.row.last_fetch_error }}
          </code>
          <b-tooltip v-else :label="props.row.last_fetch_error" multilined>
            <b-icon v-if="props.row.last_fetch_error" icon="alert" />
          </b-tooltip>
        </b-table-column>

        <!-- <b-table-column v-slot="props" field="last_import_fail" label="Errors">
          <b-tooltip :label="props.row.last_import_fail">
            <b-icon v-if="props.row.last_import_fail" icon="alert" />
          </b-tooltip>
        </b-table-column> -->
      </template>
    </b-table>
  </div>
</template>

<script>
import TableViewerMixin from '~/components/table-viewer-mixin'

export default {
  mixins: [TableViewerMixin],
  apollo: {
    q: {
      query: require('~/graphql/current-feeds.gql'),
      variables () {
        return {
          offset: this.entityOffset,
          limit: this.limit,
          specs: this.feedSpecs,
          check_last_fetch_error: this.fetchErrorFilter === 'error' ? '' : null,
          check_no_fetch_error: this.fetchErrorFilter === 'ok' ? '' : null
        }
      },
      update (data) {
        this.entities = data.entities
        this.total = data.count.aggregate.count
      },
      error (e) { this.error = e }
    }
  },
  data () {
    let spec = this.$route.query.feed_specs
    if (Array.isArray(spec)) {
    } else if (spec) {
      spec = [spec]
    } else {
      spec = ['gtfs', 'gtfs-rt', 'gbfs', 'mds']
    }
    return {
      feedSpecs: spec,
      fetchErrorFilter: this.$route.query.fetch_error_filter || 'all'
    }
  },
  computed: {
    feedPage () {
      return this.entityPage.map((feed) => {
        const feedState = feed.feed_state || {}
        const currentFeedVersion = feedState.feed_version || {}
        const currentImport = (currentFeedVersion && currentFeedVersion.feed_version_gtfs_import) || {}
        const lastFailedFeedVersion = ((feed.import_errors || [{}])[0]) || {}
        let lastImportFail = null
        if (lastFailedFeedVersion.id > (currentFeedVersion.id || 0)) {
          lastImportFail = lastFailedFeedVersion.feed_version_gtfs_import.exception_log
        }
        return {
          onestop_id: feed.onestop_id,
          spec: feed.spec,
          last_fetched_at: feedState.last_fetched_at,
          last_fetch_error: feedState.last_fetch_error,
          last_successful_fetch_at: feedState.last_successful_fetch_at,
          last_successful_import_at: currentImport.created_at,
          last_import_fail: lastImportFail,
          feed_version_count: feed.feed_versions_aggregate.aggregate.count
        }
      })
    }
  },
  watch: {
    fetchErrorFilter (v) {
      this.$router.replace({ name: 'feeds', query: { ...this.$route.query, fetch_error_filter: v } })
    },
    feedSpecs (v) {
      this.$router.replace({ name: 'feeds', query: { ...this.$route.query, fetch_specs: v } })
    }
  }
}
</script>
