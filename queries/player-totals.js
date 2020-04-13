db.players.aggregate(
    [{$match: {
      nameFirst: 'Babe',
      nameLast: 'Ruth'
    }}, {$lookup: {
      from: 'batting',
      localField: 'playerId',
      foreignField: 'playerId',
      as: 'batting'
    }}, {$unwind: {
      'path': '$batting'
    }}, {$group: {
      _id: 'playerId',
      games: {
        $sum: '$batting.games'
      },
      atBats: {
        $sum: '$batting.atBats'
      },
      runs: {
        $sum: '$batting.runs'
      },
      hits: {
        $sum: '$batting.hits'
      },
      doubles: {
        $sum: '$batting.doubles'
      },
      triples: {
        $sum: '$batting.triples'
      },
      homeRuns: {
        $sum: '$batting.homeRuns'
      },
      rbi: {
        $sum: '$batting.rbi'
      },
      stolenBases: {
        $sum: '$batting.stolenBases'
      },
      baseOnBalls: {
        $sum: '$batting.baseOnBalls'
      },
      strikeouts: {
        $sum: '$batting.strikeouts'
      },
      hitByPitch: {
        $sum: '$batting.hitByPitch'
      },
      sacrificeHits: {
        $sum: '$batting.sacrificeHits'
      }
    }}]
)
