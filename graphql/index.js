import Vue from 'vue'
import VueApollo from 'vue-apollo'
import ApolloClient from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

Vue.use(VueApollo)

const cache = new InMemoryCache()
const link = new HttpLink({
  uri: 'https://api.transit.land/api/v2/graphql'
})

const apolloClient = new ApolloClient({
  cache,
  link
})

// And we reference this client needed by vue-apollo
export default new VueApollo({
  defaultClient: apolloClient
})
