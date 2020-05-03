db.parks.updateOne({'parkId': 'ATL01'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -84.389, 33.739 ] }
})

db.parks.updateOne({'parkId': 'ATL02'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -84.389444, 33.735278 ] }
})

db.parks.updateOne({'parkId': 'ATL03'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -84.468, 33.89 ] }
})

db.parks.updateOne({'parkId': 'BAL12'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -76.621667, 39.283889 ] }
})

db.parks.updateOne({'parkId': 'BOS07'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -71.09775, 42.34625 ] }
})

db.parks.updateOne({'parkId': 'BOS07'}, {
  $set: { 'location.type': 'Point', 'location.coordinates': [ -87.65568, 41.948038 ] }
})
