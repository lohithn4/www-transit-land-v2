<template>
  <div>
    <div class="clearfix">
      <div v-for="week of displayWeeks" :key="week">
        <div class="col">
          <span class="cell month" :title="week">{{ formatMonth(week) }}</span>
        </div>
      </div>
    </div>
    <div v-for="[key,sls] of serviceMaps" :key="key" class="clearfix">
      <div v-for="week of displayWeeks" :key="week">
        <div class="col">
          <span v-if="sls[week]" class="cell day" :style="cmap(key, sls[week].service_sum)" />
          <span v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { parseISO, format, add, isBefore } from 'date-fns'
import gql from 'graphql-tag'

const q = gql`
query($start_date:date, $end_date:date, $feed_version_ids:[bigint!]) {
  feed_version_service_levels(limit:1000, where:{route_id: {_is_null:true },feed_version_id:{_in:$feed_version_ids}, start_date:{_lte:$start_date}, end_date:{_gte:$end_date}}) {
    id
    feed_version_id
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

export default {
  props: {
    fvids: { type: Array, default () { return [] } }
  },
  data () {
    return {
      displayStartDate: '2020-01-06',
      displayEndDate: '2020-12-28',
      routeId: null,
      feed_version_service_levels: [],
      route_fvsl: []
    }
  },
  apollo: {
    feed_version_service_levels: {
      query: q,
      variables () {
        return {
          feed_version_ids: this.fvids
        }
      },
      error (e) { this.error = e }
    }
  },
  computed: {
    displayWeeks () {
      // todo: find monday of displayStartDate
      const g = []
      let startDate = parseISO(this.displayStartDate)
      const endDate = parseISO(this.displayEndDate)
      while (isBefore(startDate, endDate)) {
        g.push(format(startDate, 'yyyy-MM-dd'))
        startDate = add(startDate, { days: 7 })
      }
      return g
    },
    serviceGroups () {
      const g = new Map()
      for (const sl of this.feed_version_service_levels) {
        const a = g.get(sl.feed_version_id) || []
        sl.service_sum = sl.monday + sl.tuesday + sl.wednesday + sl.thursday + sl.friday + sl.saturday + sl.sunday
        a.push(sl)
        g.set(sl.feed_version_id, a)
      }
      return g
    },
    serviceMaps () {
      const m = []
      // sort by feed_version_id
      const mm = [...this.serviceGroups.keys()].sort(function (a, b) { return b - a })
      for (const fvid of mm) {
        const x = this.serviceGroups.get(fvid).sort(function (a, b) {
          return a.start_date < b.start_date
        })
        const weeks = {} // string keys
        for (const sl of x) {
          let startDate = parseISO(sl.start_date) // always a monday
          const endDate = parseISO(sl.end_date)
          while (isBefore(startDate, endDate)) {
            const wkkey = format(startDate, 'yyyy-MM-dd')
            weeks[wkkey] = Object.assign({}, sl, { start_date: wkkey })
            startDate = add(startDate, { days: 7 })
          }
        }
        // m.push([fvid, x2])
        m.push([fvid, weeks])
      }
      return m
    },
    serviceMax () {
      const g = new Map()
      for (const [k, v] of this.serviceMaps) {
        for (const sl of Object.values(v)) {
          const a = Math.max(g.get(k) || 0, sl.service_sum)
          g.set(k, a)
        }
      }
      return g
    }
  },
  methods: {
    formatDay (start, offset) {
      const d = parseISO(start)
      return format(add(d, { days: offset }), 'PPPP')
    },
    formatTooltip (k, v) {
      return `
      ${Math.ceil(v / 3600)} service hours
      ${Math.ceil((v) * 100 / this.serviceMax.get(k))}% of max
      `
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
    cmap (k, v) {
      const c = Math.floor((1 - (v / this.serviceMax.get(k))) * 50) + 50
      return {
        'background-color': 'hsl(215,100%,' + c + '%)'
      }
    }
  }
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
    padding-bottom:5px;
}
.cell {
    display:block;
    width:20px;
    height:20px;
    border:solid 1px #fff;
}
.days {
  font-size:10pt;
  width: 40px !important;
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
  top: -60px;
  left: 0%;
}

.col span:hover .tt {
  visibility: visible;
}

</style>
