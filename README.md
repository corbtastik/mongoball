## mongoDB + baseball = mongoball

### The Gist

1. Get yo-self a [MongoDB](https://www.mongodb.com/cloud/atlas) instance
1. Clone this repo
1. Edit [`mongoball.var`](/mongoball.var) and add your config (mongodb host, mongoball db name)
1. Create a `.creds.var` file and add your deets (user, password, authdb)
1. Run `./mongoball.sh`

[This script](/mongoball.sh) clones the [Chadwick Baseball Bureau's](https://github.com/chadwickbureau) [Baseball Databank](https://github.com/chadwickbureau/baseballdatabank) and uses `mongoimport` to populate a mongodb instance.

It requires a user in mongodb with at least readWrite and can't run wide open.  See the mongodb docs on [users](https://docs.mongodb.com/manual/core/security-users/) and [roles](https://docs.mongodb.com/manual/reference/built-in-roles/).

### Creds

**.creds.var** - create and place next to `mongoball.sh` (this file is in `.gitignore`).

```bash
MONGODB_USER=harrycaray
MONGODB_PASSWORD=holycow
MONGODB_AUTHDB=admin
```

### Mongoball vars

**mongoball.var** - add your config (this file is read by `mongoball.sh`).

```bash
MONGODB_HOST=cluster0-shard-00-00-negae.gcp.mongodb.net:27017 #atlas cluster
# MONGODB_HOST=localhost:27017 #local
MONGOBALL_DB=mongoball
```

### Collections

Each [baseballdatabank](https://github.com/chadwickbureau/baseballdatabank) file is loaded as a [Collection](https://docs.mongodb.com/manual/core/databases-and-collections/) in the database `$MONGOBALL_DB`.

```txt
| ------------------- | ------ | --------------- | ------ | --------------- | ----- |
| allStar             | 5291   | fielding        | 143046 | people          | 19878 |
| appearances         | 107357 | fieldingOF      | 12028  | pitching        | 47628 |
| awardsManagers      | 179    | fieldingOFsplit | 33279  | pitchingPost    | 5798  |
| awardsPlayers       | 6236   | fieldingPost    | 13938  | salaries        | 26428 |
| awardsShareManagers | 425    | hallOfFame      | 4191   | schools         | 1207  |
| awardsSharePlayers  | 6879   | homeGames       | 3108   | seriesPost      | 343   |
| batting             | 107429 | managers        | 3536   | teams           | 2925  |
| battingPost         | 14750  | managersHalf    | 93     | teamsFranchises | 120   |
| collegePlaying      | 17350  | parks           | 252    | teamsHalf       | 52    |
| ------------------- | ------ | --------------- | ------ | --------------- | ----- |
```

### Queries

1. Find Jackie Robinson and Babe Ruth

```javascript
db.people.find({ nameFirst: "Jackie", nameLast: "Robinson"}).pretty()
db.people.find({nameFirst: "Babe", nameLast: "Ruth"}).pretty()
```

2. Find the player with most homers in a single season, output only playerId, yearId and homeRuns.

```javascript
// using sort and limit
db.batting.find({}, {"_id":1, "playerId":1, "yearId":1, "homeRuns":1}).sort({homeRuns:-1}).limit(1).pretty()
```

### References

1. [MongoDB](https://mongodb.com)
1. [Atlas](https://atlas.mongodb.com) - mongoDB as a Service across the globe
1. [Mongoimport](https://docs.mongodb.com/manual/reference/program/mongoimport/) - used by `mongoball.sh`
1. [Baseball Databank](https://github.com/chadwickbureau/baseballdatabank) - source of data
1. [Chadwick Baseball Bureau](https://github.com/chadwickbureau) - check them out!
1. [Sean Lahman Baseball Archive](http://www.seanlahman.com/baseball-archive/statistics/)
