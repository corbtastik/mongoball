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

| Collection  | Documents |
| ------------- | ------------- |
| allStar  | 5291  |
| appearances  | 107357  |
| awardsManagers | 179 |
| awardsPlayers | 6236 |
| awardsShareManagers | 425 |
| awardsSharePlayers | 6879 |
| batting | 107429 |
| battingPost | 14750 |
| collegePlaying | 17350 |
| fielding | 143046 |
| fieldingOF | 12028 |
| fieldingOFsplit | 33279 |
| fieldingPost | 13938 |
| hallOfFame | 4191 |
| homeGames | 3108 |
| managers | 3536 |
| managersHalf | 93 |
| parks | 252 |
| people | 19878 |
| pitching | 47628 |
| pitchingPost | 5798 |
| salaries | 26428 |
| schools | 1207 |
| seriesPost | 343 |
| teams | 2925 |
| teamsFranchises | 120 |
| teamsHalf | 52 |


### References

1. [MongoDB](https://mongodb.com)
1. [Atlas](https://atlas.mongodb.com) - mongoDB as a Service across the globe
1. [Mongoimport](https://docs.mongodb.com/manual/reference/program/mongoimport/) - used by `mongoball.sh`
1. [Baseball Databank](https://github.com/chadwickbureau/baseballdatabank) - source of data
1. [Chadwick Baseball Bureau](https://github.com/chadwickbureau) - check them out!
1. [Sean Lahman Baseball Archive](http://www.seanlahman.com/baseball-archive/statistics/)
