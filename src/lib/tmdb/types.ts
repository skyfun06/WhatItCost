// Types bruts retournés par l'API TMDB v3

export interface TMDBMovie {
  id: number
  title: string
  release_date: string   // "YYYY-MM-DD"
  budget: number         // 0 si non renseigné dans TMDB
  poster_path: string | null
  overview: string
  genres: TMDBGenre[]
  credits?: {
    crew: TMDBCrewMember[]
    cast: TMDBCastMember[]
  }
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string        // "Director", "Producer", etc.
  department: string
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  order: number      // Position dans le générique (0 = tête d'affiche)
}

export interface TMDBDiscoverResponse {
  page: number
  results: TMDBMovie[]
  total_results: number
  total_pages: number
}
