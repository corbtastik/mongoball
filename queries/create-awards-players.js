db.people.aggregate([
  {
    '$project': {
          '_id': '$playerId',
          'playerId': 1,
          'birthCountry': 1,
          'birthState': 1,
          'birthCity': 1,
          'nameFirst': 1,
          'nameLast': 1,
          'nameGiven': 1,
          'weight': 1,
          'height': 1,
          'bats': 1,
          'throws': 1,
          'debut': 1,
          'finalGame': 1,
          'retroId': 1,
          'bbrefId': 1,
          'birthDate': {
            '$dateFromParts': {
              'year': '$birthYear',
              'month': '$birthMonth',
              'day': '$birthDay'
            }
          },
          'deathDate': {
            '$dateFromParts': {
              'year': '$deathYear',
              'month': '$deathMonth',
              'day': '$deathDay'
            }
          }
        }
  }, {
    '$lookup': {
      'from': 'awardsPlayers',
      'localField': '_id',
      'foreignField': 'playerId',
      'as': 'awards.player'
    }
  }, {
    '$merge': 'players'
  }
])
