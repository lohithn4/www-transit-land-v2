<template>
  <div>
    <b-field v-if="route_fvsls.length > 0" grouped label="Filter by route">
      <b-select v-model="routeId">
        <option value="">
          All routes
        </option>
        <option v-for="rsl of route_fvsls" :key="rsl.id" :value="rsl.route_id">
          {{ rsl.route_short_name }} {{ rsl.route_long_name }}
        </option>
      </b-select>
      <span v-if="route_fvsls.length >= 1000" class="tag">Note: only the first 1,000 routes are shown</span>
    </b-field>

    <div class="clearfix">
      <div v-for="week of displayWeeks" :key="week">
        <div class="col">
          <span class="cell month" :title="week">{{ formatMonth(week) }}</span>
        </div>
      </div>
    </div>

    <div v-for="[key,sls] of rowBlocks" :key="key" class="clearfix">
      <div v-for="sl of sls" :key="sl.id">
        <div class="col">
          <span v-if="sl.value" class="cell day" :style="cmap(sl.value / sl.max)">
            <span class="tt">
              <template v-if="weekAgg">
                Week of<br>
              </template>
              {{ formatDay(sl.day, 0) }}<br>
              <template v-if="routeId">
                {{ sl.route_short_name }} {{ sl.route_long_name }}<br>
              </template>
              <template v-else>
                Feed version ID: {{ sl.feed_version_id }}<br>
              </template>
              {{ Math.ceil(sl.value / 3600) }} service hours <br>
              {{ Math.ceil((sl.value * 100)/ sl.max) }}% of max
              <br>
            </span>
          </span>
          <span v-else />
        </div>
      </div>

      <div class="col days">
        <span class="">{{ key }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { parseISO, format, add, isBefore } from 'date-fns'
import gql from 'graphql-tag'

const q = gql`
query($start_date:date, $end_date:date, $feed_version_ids:[bigint!], $all_routes:Boolean, $route_id:String) {
  fvsls: feed_version_service_levels(limit:1000, where:{route_id:{_is_null:$all_routes, _eq:$route_id}, feed_version_id:{_in:$feed_version_ids}, start_date:{_lte:$start_date}, end_date:{_gte:$end_date}}) {
    id
    feed_version_id
    route_id
    route_short_name
    route_long_name
    start_date
    end_date
    monday
    tuesday
    wednesday
    thursday
    friday
    saturday
    sunday
  }
}
`

const q2 = gql`
query($start_date:date, $end_date:date, $feed_version_id:bigint) {
  route_fvsls: feed_version_service_levels(limit: 1000, where: {feed_version_id: {_eq: $feed_version_id}, start_date: {_lte: $start_date}, end_date: {_gte: $end_date}}, distinct_on: route_id) {
    id
    feed_version_id
    route_id
    route_short_name
    route_long_name
    route_type
  }
}
`

export default {
  props: {
    fvids: { type: Array, default () { return [] } },
    startDate: { type: String, default () { return null } },
    endDate: { type: String, default () { return null } },
    maxWeeks: { type: Number, default () { return 52 } },
    weekAgg: { type: Boolean, default () { return false } }
  },
  data () {
    return {
      routeId: null,
      fvsls: [],
      route_fvsls: [],
      fvAgg: false
    }
  },
  apollo: {
    fvsls: {
      query: q,
      variables () {
        return {
          feed_version_ids: this.fvids,
          route_id: this.routeId,
          all_routes: this.routeId ? null : true
        }
      },
      error (e) { this.error = e }
    },
    route_fvsls: {
      query: q2,
      variables () {
        return { feed_version_id: this.fvids[0] }
      },
      skip () { return this.fvids.length > 1 }
    }
  },
  computed: {
    displayStartDate () {
      const days = this.fvsls.map((s) => { return s.start_date }).sort()
      if (days.length > 0) {
        return days[0]
      }
      return '2020-01-01'
    },
    displayEndDate () {
      const days = this.fvsls.map((s) => { return s.end_date }).sort()
      if (days.length > 0) {
        return days[days.length - 1]
      }
      return '2020-01-01'
    },
    displayWeeks () {
      const g = []
      let startDate = parseISO(this.displayStartDate)
      const endDate = parseISO(this.displayEndDate)
      while (isBefore(startDate, endDate)) {
        g.push(format(startDate, 'yyyy-MM-dd'))
        startDate = add(startDate, { days: 7 })
      }
      return g.reverse().slice(0, this.maxWeeks).reverse()
    },
    rowGroups () {
      // Group fvsls by key and expand out into weeks
      if (this.weekAgg) {
        // bind to this.weekAgg
      }
      const groups = new Map()
      // Order by feed_version_id
      const order = this.fvsls
        .slice(0)
        .sort(function (a, b) { return b.feed_version_id - a.feed_version_id })
      for (const fvsl of order) {
        // Expand
        for (const [k, v] of this.slRowKeys(fvsl)) {
          const a = groups.get(k) || []
          a.push(v)
          groups.set(k, a)
        }
      }
      return groups
    },
    rowBlocks () {
      // Add columns and rows
      const g = []
      let xid = 0
      for (const [key, sls] of this.rowGroups) {
        const weeks = new Map()
        let maxval = 0
        for (const sl of sls) {
          maxval = Math.max(maxval, sl.value)
          weeks.set(sl.start_date, sl)
        }
        for (const v of weeks.values()) {
          v.max = maxval
        }
        g.push([key, this.displayWeeks.map((week) => { return weeks.get(week) || { id: xid++ } })])
      }
      return g
    }
  },
  methods: {
    slRowKeys (fvsl) {
      // Create a record for every week, for every route or fv
      const values = []
      const sldup = []
      // Expand into single weeks
      let startDate = parseISO(fvsl.start_date) // always a monday
      const endDate = parseISO(fvsl.end_date)
      while (isBefore(startDate, endDate)) {
        const day = format(startDate, 'yyyy-MM-dd')
        sldup.push(Object.assign({}, fvsl, { start_date: day }))
        startDate = add(startDate, { days: 7 })
      }
      // For each week, generate a single week-aggregate row or a row for each day
      for (const sl of sldup) {
        const days = [sl.monday, sl.tuesday, sl.wednesday, sl.thursday, sl.friday, sl.saturday, sl.sunday]
        if (this.weekAgg) {
          const val = days.reduce(function (a, b) { return a + b }, 0)
          values.push([
          `${sl.feed_version_id}-${sl.route_id === null ? '' : sl.route_id}`,
          {
            route_short_name: sl.route_short_name,
            route_long_name: sl.route_long_name,
            route_id: sl.route_id,
            start_date: sl.start_date,
            end_date: sl.end_date,
            value: val,
            day: sl.start_date,
            feed_version_id: sl.feed_version_id
          }
          ])
        } else {
          for (let i = 0; i < days.length; i++) {
            const day = add(parseISO(sl.start_date), { days: i })
            values.push([
            `${sl.feed_version_id}-${sl.route_id === null ? '' : sl.route_id}-${dow[i]}`,
            {
              route_short_name: sl.route_short_name,
              route_long_name: sl.route_long_name,
              route_id: sl.route_id,
              start_date: sl.start_date,
              end_date: sl.end_date,
              value: days[i],
              day: format(day, 'yyyy-MM-dd'),
              feed_version_id: sl.feed_version_id
            }
            ])
          }
        }
      }
      return values
    },
    formatDay (start, offset) {
      const d = parseISO(start)
      return format(add(d, { days: offset }), 'PPPP')
    },
    formatMonth (v) {
      const s = v.split('-')
      const t = parseInt(s[1])
      const d = parseInt(s[2])
      if (d > 7) {
        return ''
      }
      if (t === 1) {
        return s[0] + ' ' + months[t]
      }
      return months[t]
    },
    cmap (v) {
      const c = Math.floor((1 - (v)) * 50) + 50
      return {
        'background-color': 'hsl(215,100%,' + c + '%)'
      }
    }
  }
}

const dow = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
  5: 'Sat',
  6: 'Sun'
}

const months = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec'
}

</script>

<style scoped>
.col {
    position:relative;
    width: 20px;
    float: left;
    padding-bottom:1px;
}

.cell {
    display:block;
    width:20px;
    height:20px;
    border:solid 1px #fff;
}

.days {
  font-size:8pt;
  width: 200px !important;
}

.cell.day:hover {
    border:solid 1px #ff0000;
}

.month {
    width:100px;
    font-size:10pt;
    border:none;
}

.col .tt {
  visibility: hidden;
  width: 280px;
  background-color: black;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;

  /* Position the tooltip */
  position: absolute;
  z-index: 1;
  top: -120px;
  left: -90px;
}

.col span:hover .tt {
  visibility: visible;
}

</style>
