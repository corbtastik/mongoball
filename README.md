## mongoball

MongoDB + Baseball data

1. Get yo self a [MongoDB](https://mongodb.com) instance
1. Clone this repo
1. Edit `MONGO_HOST` in `mongoball.sh`
1. Run `./mongoball.sh`

Mongoball script clones `chadwickbureau/baseballdatabank` and used `mongoimport` to populate the `baseballdb` collection.  Source data remains intact with humble changes to property names for readability.

## references

1. [MongoDB](https://mongodb.com)
1. [Mongoimport](https://docs.mongodb.com/manual/reference/program/mongoimport/)
1. [Sean Lahman Baseball Archive](http://www.seanlahman.com/baseball-archive/statistics/)
1. [Baseball Databank](https://github.com/chadwickbureau/baseballdatabank)
