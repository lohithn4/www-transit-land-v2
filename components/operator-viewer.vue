<template>
  <div>
    <b-field label="Search by operator name or location">
      <div v-if="$route.query.agency_name || $route.query.city_name || $route.query.state_name || $route.query.country_name">
        <b-tag
          size="is-medium"
          attached
          closable
          aria-close-label="Close tag"
          @close="clearQuery"
        >
          {{ $route.query.agency_name || $route.query.city_name || $route.query.state_name || $route.query.country_name }}
        </b-tag>
      </div>
      <div v-else>
        <agency-autocomplete @selected="onAutocomplete" />
      </div>
    </b-field>

    <b-message v-if="error" class="is-danger">
      {{ error }}
    </b-message>

    <b-table
      :data="currentPageEntities"
      :striped="true"
      :paginated="true"
      :pagination-simple="true"
      :loading="$apollo.loading"
      pagination-position="both"
      sort-icon="menu-up"
      :total="total"
      :current-page="currentPage"
      backend-pagination
      backend-sorting
      @sort="onSort"
      @page-change="onPageChange"
    >
      <!-- TODO: fix sorting -->
      <template slot-scope="props">
        <b-table-column field="agency_name" label="Operator Name">
          <nuxt-link :to="{name: 'operators-operator', params: {operator: props.row.operator_onestop_id}}">
            {{ props.row.agency_name }}
          </nuxt-link>
        </b-table-column>
        <b-table-column field="city_name" label="City" :width="200">
          {{ props.row.city_name }}
        </b-table-column>
        <b-table-column field="state_name" label="State/Province" :width="200">
          {{ props.row.state_name }}
        </b-table-column>
        <b-table-column field="country_name" label="Country" :width="260">
          {{ props.row.country_name }}
        </b-table-column>
      </template>
    </b-table>
  </div>
</template>

<script>
import AgencyAutocomplete from '~/components/agency-autocomplete'

export default {
  components: { AgencyAutocomplete },
  data () {
    return {
      blockEntities: new Map(),
      blockSize: 100,
      total: 0,
      error: null
    }
  },
  apollo: {
    q: {
      query: require('~/graphql/agency-operator-merge.gql'),
      error (e) { this.error = e },
      variables () {
        const vars = {
          limit: 100,
          offset: this.blockOffset,
          order_by: [{ country_name: 'asc' }, { state_name: 'asc' }, { city_name: 'asc' }, { agency_name: 'asc' }]
        }
        const q = Object.assign({}, this.$route.query)
        vars.agency_name = q.agency_name ? `%${q.agency_name}%` : null
        vars.city_name = q.city_name ? `%${q.city_name}%` : null
        vars.state_name = q.state_name ? `%${q.state_name}%` : null
        vars.country_name = q.country_name ? `%${q.country_name}%` : null
        return vars
      },
      update (data) {
        const b = new Map()
        for (let i = 0; i < data.entities.length; i++) {
          b.set(i + this.blockOffset, data.entities[i])
        }
        this.blockEntities = b
        this.total = data.count.aggregate.count
      }
    }
  },
  computed: {
    blockOffset () {
      const blockOffset = Math.floor(((this.currentPage - 1) * 20) / this.blockSize) * this.blockSize
      return blockOffset
    },
    currentPage () {
      return this.$route.query.page ? parseInt(this.$route.query.page) : 1
    },
    currentPageEntities () {
      const a = (this.currentPage - 1) * 20
      const b = []
      for (let i = a; i < a + 20; i++) {
        const row = this.blockEntities.get(i)
        if (!row) {
          return b
        }
        b.push(row)
      }
      return b
    }
  },
  methods: {
    clearQuery () {
      this.$router.push({ path: 'operators', query: { } })
    },
    onAutocomplete (a, b) {
      const q = { page: 1 }
      q[a] = b
      this.$router.push({ path: 'operators', query: q })
    },
    onPageChange (page) {
      const q = Object.assign({}, this.$route.query)
      q.page = page
      this.$router.push({ path: 'operators', query: q })
    },
    onSort (field, order) {
    }
  }
}
</script>