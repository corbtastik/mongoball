#!/bin/bash
MONGO_HOST=mongo.retro.io:27017
git clone https://github.com/chadwickbureau/baseballdatabank.git mongoball
# ----------------------------------------------------------------------------
# Create import files without header row
# ----------------------------------------------------------------------------
tail -n +2 ./mongoball/core/AllstarFull.csv > ./mongoball/core/AllstarFull-noheader.csv
tail -n +2 ./mongoball/core/Appearances.csv > ./mongoball/core/Appearances-noheader.csv
tail -n +2 ./mongoball/core/AwardsManagers.csv > ./mongoball/core/AwardsManagers-noheader.csv
tail -n +2 ./mongoball/core/AwardsPlayers.csv > ./mongoball/core/AwardsPlayers-noheader.csv
tail -n +2 ./mongoball/core/AwardsShareManagers.csv > ./mongoball/core/AwardsShareManagers-noheader.csv
tail -n +2 ./mongoball/core/AwardsSharePlayers.csv > ./mongoball/core/AwardsSharePlayers-noheader.csv
tail -n +2 ./mongoball/core/Batting.csv > ./mongoball/core/Batting-noheader.csv
tail -n +2 ./mongoball/core/BattingPost.csv > ./mongoball/core/BattingPost-noheader.csv
tail -n +2 ./mongoball/core/CollegePlaying.csv > ./mongoball/core/CollegePlaying-noheader.csv
tail -n +2 ./mongoball/core/Fielding.csv > ./mongoball/core/Fielding-noheader.csv
tail -n +2 ./mongoball/core/FieldingOF.csv > ./mongoball/core/FieldingOF-noheader.csv
tail -n +2 ./mongoball/core/FieldingOFsplit.csv > ./mongoball/core/FieldingOFsplit-noheader.csv
tail -n +2 ./mongoball/core/FieldingPost.csv > ./mongoball/core/FieldingPost-noheader.csv
tail -n +2 ./mongoball/core/HallOfFame.csv > ./mongoball/core/HallOfFame-noheader.csv
tail -n +2 ./mongoball/core/HomeGames.csv > ./mongoball/core/HomeGames-noheader.csv
tail -n +2 ./mongoball/core/Managers.csv > ./mongoball/core/Managers-noheader.csv
tail -n +2 ./mongoball/core/ManagersHalf.csv > ./mongoball/core/ManagersHalf-noheader.csv
tail -n +2 ./mongoball/core/Parks.csv > ./mongoball/core/Parks-noheader.csv
tail -n +2 ./mongoball/core/People.csv > ./mongoball/core/People-noheader.csv
tail -n +2 ./mongoball/core/Pitching.csv > ./mongoball/core/Pitching-noheader.csv
tail -n +2 ./mongoball/core/PitchingPost.csv > ./mongoball/core/PitchingPost-noheader.csv
tail -n +2 ./mongoball/core/Salaries.csv > ./mongoball/core/Salaries-noheader.csv
tail -n +2 ./mongoball/core/Schools.csv > ./mongoball/core/Schools-noheader.csv
tail -n +2 ./mongoball/core/SeriesPost.csv > ./mongoball/core/SeriesPost-noheader.csv
tail -n +2 ./mongoball/core/Teams.csv > ./mongoball/core/Teams-noheader.csv
tail -n +2 ./mongoball/core/TeamsFranchises.csv > ./mongoball/core/TeamsFranchises-noheader.csv
tail -n +2 ./mongoball/core/TeamsHalf.csv > ./mongoball/core/TeamsHalf-noheader.csv
# ----------------------------------------------------------------------------
# import AllstarFull
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=AllstarFull \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),gameNum.int32(),gameId.string(),teamId.string(),lgId.string(),playedInGame.int32(),startingPos.int32()" \
  --file=./mongoball/core/AllstarFull-noheader.csv
# ----------------------------------------------------------------------------
# import Appearances
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Appearances \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),teamId.string(),lgId.string(),playerId.string(),gamesAll.int32(),gamesStarted.int32(),gamesBatting.int32(),gamesDefense.int32(),gamesPitcher.int32(),gamesCatcher.int32(),games1b.int32(),games2b.int32(),games3b.int32(),gamesSs.int32(),gamesLf.int32(),gamesCf.int32(),gamesRf.int32(),gamesOf.int32(),gamesDh.int32(),gamesPh.int32(),gamesPr.int32()" \
  --file=./mongoball/core/Appearances-noheader.csv
# ----------------------------------------------------------------------------
# import AwardsManagers
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=AwardsManagers \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),awardId.string(),yearId.int32(),lgId.string(),tie.string(),notes.string()" \
  --file=./mongoball/core/AwardsManagers-noheader.csv
# ----------------------------------------------------------------------------
# import AwardsPlayers
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=AwardsPlayers \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),awardId.string(),yearId.int32(),lgId.string(),tie.string(),notes.string()" \
  --file=./mongoball/core/AwardsPlayers-noheader.csv
# ----------------------------------------------------------------------------
# import AwardsShareManagers
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=AwardsShareManagers \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="awardId.string(),yearId.int32(),lgId.string(),playerId.string(),pointsWon.double(),pointsMax.double(),votesFirst.double()" \
  --file=./mongoball/core/AwardsShareManagers-noheader.csv
# ----------------------------------------------------------------------------
# import AwardsSharePlayers
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=AwardsSharePlayers \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="awardId.string(),yearId.int32(),lgId.string(),playerId.string(),pointsWon.double(),pointsMax.double(),votesFirst.double()" \
  --file=./mongoball/core/AwardsSharePlayers-noheader.csv
# ----------------------------------------------------------------------------
# import Batting
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Batting \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),stint.int32(),teamId.string(),lgId.string(),games.int32(),atBats.int32(),runs.int32(),hits.int32(),doubles.int32(),triples.int32(),homeRuns.int32(),rbi.int32(),stolenBases.int32(),caughtStealing.int32(),baseOnBalls.int32(),strikeouts.int32(),intentionalWalks.int32(),hitByPitch.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),groundedIntoDoublePlays.int32()" \
  --file=./mongoball/core/Batting-noheader.csv
# ----------------------------------------------------------------------------
# import BattingPost
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=BattingPost \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),round.string(),playerId.string(),teamId.string(),lgId.string(),games.int32(),atBats.int32(),runs.int32(),hits.int32(),doubles.int32(),triples.int32(),homeRuns.int32(),rbi.int32(),stolenBases.int32(),caughtStealing.int32(),baseOnBalls.int32(),strikeouts.int32(),intentionalWalks.int32(),hitByPitch.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),groundedIntoDoublePlays.int32()" \
  --file=./mongoball/core/BattingPost-noheader.csv
# ----------------------------------------------------------------------------
# import CollegePlaying
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=CollegePlaying \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),schoolId.string(),yearId.int32()" \
  --file=./mongoball/core/CollegePlaying-noheader.csv
# ----------------------------------------------------------------------------
# import Fielding
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Fielding \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),stint.int32(),teamId.string(),lgId.string(),position.string(),games.int32(),gamesStarted.int32(),innOuts.int32(),putOuts.int32(),assists.int32(),errors.int32(),doublePlays.int32(),passedBalls.int32(),wildPitches.int32(),stolenBases.int32(),caughtStealing.int32(),zoneRating.int32()" \
  --file=./mongoball/core/Fielding-noheader.csv
# ----------------------------------------------------------------------------
# import FieldingOF
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=FieldingOF \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),stint.int32(),gamesLf.int32(),gamesCf.int32(),gamesRf.int32()" \
  --file=./mongoball/core/FieldingOF-noheader.csv
# ----------------------------------------------------------------------------
# import FieldingOFsplit
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=FieldingOFsplit \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),stint.int32(),teamId.string(),lgId.string(),position.string(),games.int32(),gamesStarted.int32(),innOuts.int32(),putOuts.int32(),assists.int32(),errors.int32(),doublePlays.int32(),passedBalls.int32(),wildPitches.int32(),stolenBases.int32(),caughtStealing.int32(),zoneRating.int32()" \
  --file=./mongoball/core/FieldingOFsplit-noheader.csv
# ----------------------------------------------------------------------------
# import FieldingPost
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=FieldingPost \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),teamId.string(),lgId.string(),round.string(),position.string(),games.int32(),gamesStarted.int32(),innOuts.int32(),putOuts.int32(),assists.int32(),errors.int32(),doublePlays.int32(),triplePlays.int32(),passedBalls.int32(),stolenBases.int32(),caughtStealing.int32()" \
  --file=./mongoball/core/FieldingPost-noheader.csv
# ----------------------------------------------------------------------------
# import HallOfFame
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=HallOfFame \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),votedBy.string(),ballots.int32(),needed.int32(),votes.int32(),inducted.string(),category.string(),needed_note.string()" \
  --file=./mongoball/core/HallOfFame-noheader.csv
# ----------------------------------------------------------------------------
# import HomeGames
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=HomeGames \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),lgId.string(),teamId.string(),parkId.string(),firstDate.date(2006-01-02),lastDate.date(2006-01-02),games.int32(),openings.int32(),attendance.int32()" \
  --file=./mongoball/core/HomeGames-noheader.csv
# ----------------------------------------------------------------------------
# import Managers
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Managers \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),teamId.string(),lgId.string(),inseason.int32(),games.int32(),wins.int32(),losses.int32(),rank.int32(),playerManager.string()" \
  --file=./mongoball/core/Managers-noheader.csv
# ----------------------------------------------------------------------------
# import ManagersHalf
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=ManagersHalf \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),teamId.string(),lgId.string(),inseason.int32(),half.int32(),games.int32(),wins.int32(),losses.int32(),rank.int32()" \
  --file=./mongoball/core/ManagersHalf-noheader.csv
# ----------------------------------------------------------------------------
# import Parks
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Parks \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="parkId.string(),parkName.string(),parkAlias.string(),city.string(),state.string(),country.string()" \
  --file=./mongoball/core/Parks-noheader.csv
# ----------------------------------------------------------------------------
# import People
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=People \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),birthYear.int32(),birthMonth.int32(),birthDay.int32(),birthCountry.string(),birthState.string(),birthCity.string(),deathYear.int32(),deathMonth.int32(),deathDay.int32(),deathCountry.string(),deathState.string(),deathCity.string(),nameFirst.string(),nameLast.string(),nameGiven.string(),weight.int32(),height.int32(),bats.string(),throws.string(),debut.date(2006-01-02),finalGame.date(2006-01-02),retroId.string(),bbrefId.string()" \
   --file=./mongoball/core/People-noheader.csv
# ----------------------------------------------------------------------------
# import Pitching
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
   --db=baseballdb \
   --collection=Pitching \
   --type=csv \
   --columnsHaveTypes \
   --ignoreBlanks \
   --fields="playerId.string(),yearId.int32(),stint.int32(),teamId.string(),lgId.string(),wins.int32(),losses.int32(),games.int32(),gamesStarted.int32(),completeGames.int32(),shutouts.int32(),saves.int32(),ipOuts.int32(),hits.int32(),earnedRuns.int32(),homeRuns.int32(),baseOnBalls.int32(),strikeouts.int32(),oppBattingAvg.double(),era.double(),intentionalWalks.int32(),wildPitches.int32(),hitByPitch.double(),balks.int32(),battersFaced.int32(),gamesFinished.int32(),runs.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),groundedIntoDoublePlays.int32()" \
    --file=./mongoball/core/Pitching-noheader.csv
# ----------------------------------------------------------------------------
# import PitchingPost
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=PitchingPost \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="playerId.string(),yearId.int32(),round.string(),teamId.string(),lgId.string(),wins.int32(),losses.int32(),games.int32(),gamesStarted.int32(),completeGames.int32(),shutouts.int32(),saves.int32(),ipOuts.int32(),hits.int32(),earnedRuns.int32(),homeRuns.int32(),baseOnBalls.int32(),strikeouts.int32(),oppBattingAvg.double(),era.double(),intentionalWalks.int32(),wildPitches.int32(),hitByPitch.double(),balks.int32(),battersFaced.int32(),gamesFinished.int32(),runs.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),groundedIntoDoublePlays.int32()" \
   --file=./mongoball/core/PitchingPost-noheader.csv
# ----------------------------------------------------------------------------
# import Salaries
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Salaries \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),teamId.string(),lgId.string(),playerId.string(),salary.int32()" \
  --file=./mongoball/core/Salaries-noheader.csv
# ----------------------------------------------------------------------------
# import Schools
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Schools \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="schoolId.string(),name.string(),city.string(),state.string(),country.string()" \
  --file=./mongoball/core/Schools-noheader.csv
# ----------------------------------------------------------------------------
# import SeriesPost
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=SeriesPost \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),round.string(),teamIdWinner.string(),lgIdWinner.string(),teamIdLoser.string(),lgIdLoser.string(),wins.int32(),losses.int32(),ties.int32()" \
  --file=./mongoball/core/SeriesPost-noheader.csv
# ----------------------------------------------------------------------------
# import Teams
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=Teams \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),lgId.string(),teamId.string(),franchId.string(),divId.string(),rank.int32(),games.int32(),gamesHome.int32(),wins.int32(),losses.int32(),divWinner.string(),wildCardWinner.string(),leagueWinner.string(),worldSeriesWinner.string(),runs.int32(),atBats.int32(),hits.int32(),doubles.int32(),triples.int32(),homeRuns.int32(),baseOnBalls.double(),strikeouts.int32(),stolenBases.double(),caughtStealing.double(),hitByPitch.double(),sacrificeFlies.int32(),runsAllowed.int32(),earnedRunsAllowed.int32(),era.double(),completeGames.int32(),shutouts.int32(),saves.int32(),ipOuts.int32(),hitsAllowed.int32(),homeRunsAllowed.int32(),baseOnBallsAllowed.int32(),strikeoutsAllowed.int32(),errors.int32(),doublePlays.int32(),fieldingPercentage.double(),name.string(),park.string(),attendance.int32(),batterParkFactor.int32(),pitcherParkFactor.int32(),teamIdBr.string(),teamIdLahman45.string(),teamIdRetro.string()" \
  --file=./mongoball/core/Teams-noheader.csv
# ----------------------------------------------------------------------------
# import TeamsFranchises
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=TeamsFranchises \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="franchiseId.string(),name.string(),active.string(),natAssocId.string()" \
  --file=./mongoball/core/TeamsFranchises-noheader.csv
# ----------------------------------------------------------------------------
# import TeamsHalf
# ----------------------------------------------------------------------------
mongoimport --host=${MONGO_HOST} \
  --db=baseballdb \
  --collection=TeamsHalf \
  --type=csv \
  --columnsHaveTypes \
  --ignoreBlanks \
  --fields="yearId.int32(),lgId.string(),teamId.string(),half.int32(),divId.string(),divWinner.string(),rank.int32(),games.int32(),wins.int32(),losses.int32()" \
  --file=./mongoball/core/TeamsHalf-noheader.csv
