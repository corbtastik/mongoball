#!/bin/bash
# trap INT and TERM to EXIT
trap "exit" INT TERM
# kill background processes if we receive EXIT (import runs multiples in background)
trap "kill 0" EXIT
# source creds and config
source .creds.var
source mongoball.var
# clone source data
git clone https://github.com/chadwickbureau/baseballdatabank.git clones/${MONGOBALL_DB}
# ----------------------------------------------------------------------------
# Create import files without header row
# ----------------------------------------------------------------------------
tail -n +2 ./clones/${MONGOBALL_DB}/core/AllstarFull.csv > ./clones/${MONGOBALL_DB}/core/AllstarFull-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Appearances.csv > ./clones/${MONGOBALL_DB}/core/Appearances-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/AwardsManagers.csv > ./clones/${MONGOBALL_DB}/core/AwardsManagers-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/AwardsPlayers.csv > ./clones/${MONGOBALL_DB}/core/AwardsPlayers-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/AwardsShareManagers.csv > ./clones/${MONGOBALL_DB}/core/AwardsShareManagers-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/AwardsSharePlayers.csv > ./clones/${MONGOBALL_DB}/core/AwardsSharePlayers-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Batting.csv > ./clones/${MONGOBALL_DB}/core/Batting-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/BattingPost.csv > ./clones/${MONGOBALL_DB}/core/BattingPost-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/CollegePlaying.csv > ./clones/${MONGOBALL_DB}/core/CollegePlaying-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Fielding.csv > ./clones/${MONGOBALL_DB}/core/Fielding-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/FieldingOF.csv > ./clones/${MONGOBALL_DB}/core/FieldingOF-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/FieldingOFsplit.csv > ./clones/${MONGOBALL_DB}/core/FieldingOFsplit-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/FieldingPost.csv > ./clones/${MONGOBALL_DB}/core/FieldingPost-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/HallOfFame.csv > ./clones/${MONGOBALL_DB}/core/HallOfFame-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/HomeGames.csv > ./clones/${MONGOBALL_DB}/core/HomeGames-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Managers.csv > ./clones/${MONGOBALL_DB}/core/Managers-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/ManagersHalf.csv > ./clones/${MONGOBALL_DB}/core/ManagersHalf-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Parks.csv > ./clones/${MONGOBALL_DB}/core/Parks-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/People.csv > ./clones/${MONGOBALL_DB}/core/People-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Pitching.csv > ./clones/${MONGOBALL_DB}/core/Pitching-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/PitchingPost.csv > ./clones/${MONGOBALL_DB}/core/PitchingPost-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Salaries.csv > ./clones/${MONGOBALL_DB}/core/Salaries-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Schools.csv > ./clones/${MONGOBALL_DB}/core/Schools-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/SeriesPost.csv > ./clones/${MONGOBALL_DB}/core/SeriesPost-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/Teams.csv > ./clones/${MONGOBALL_DB}/core/Teams-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/TeamsFranchises.csv > ./clones/${MONGOBALL_DB}/core/TeamsFranchises-noheader.csv
tail -n +2 ./clones/${MONGOBALL_DB}/core/TeamsHalf.csv > ./clones/${MONGOBALL_DB}/core/TeamsHalf-noheader.csv

function importCollection {
    local collection=$1
    local fields=$2
    local file=$3
    local importArgs=( "--host=${MONGODB_HOST}" )

    if [ "$MONGODB_HOST" != "localhost:27017" ]; then
       importArgs+=( "--ssl" )
    fi

    importArgs+=( "--authenticationDatabase=${MONGODB_AUTHDB}" )
    importArgs+=( "--username=${MONGODB_USER}" )
    importArgs+=( "--password=${MONGODB_PASSWORD}" )
    importArgs+=( "--db=${MONGOBALL_DB}" )
    importArgs+=( "--collection=${collection}" )
    importArgs+=( "--type=csv" )
    importArgs+=( "--columnsHaveTypes" )
    importArgs+=( "--ignoreBlanks" )
    importArgs+=( "--fields=${fields}" )
    importArgs+=( "--file=${file}" )

    mongoimport "${importArgs[@]}" &
}

importCollection "allStar" \
  "playerId.string(),yearId.int32(),gameNum.int32(),
   gameId.string(),teamId.string(),lgId.string(),
   playedInGame.int32(),startingPos.int32()" \
  "./clones/${MONGOBALL_DB}/core/AllstarFull-noheader.csv"

importCollection "appearances" \
  "yearId.int32(),teamId.string(),lgId.string(),
   playerId.string(),gamesAll.int32(),gamesStarted.int32(),
   gamesBatting.int32(),gamesDefense.int32(),gamesPitcher.int32(),
   gamesCatcher.int32(),games1b.int32(),games2b.int32(),
   games3b.int32(),gamesSs.int32(),gamesLf.int32(),
   gamesCf.int32(),gamesRf.int32(),gamesOf.int32(),
   gamesDh.int32(),gamesPh.int32(),gamesPr.int32()" \
  "./clones/${MONGOBALL_DB}/core/Appearances-noheader.csv"

importCollection "awardsManagers" \
  "playerId.string(),awardId.string(),yearId.int32(),
   lgId.string(),tie.string(),notes.string()" \
  "./clones/${MONGOBALL_DB}/core/AwardsManagers-noheader.csv"

importCollection "awardsPlayers" \
  "playerId.string(),awardId.string(),yearId.int32(),
   lgId.string(),tie.string(),notes.string()" \
  "./clones/${MONGOBALL_DB}/core/AwardsPlayers-noheader.csv"

importCollection "awardsShareManagers" \
  "awardId.string(),yearId.int32(),lgId.string(),
   playerId.string(),pointsWon.double(),pointsMax.double(),
   votesFirst.double()" \
  "./clones/${MONGOBALL_DB}/core/AwardsShareManagers-noheader.csv"

importCollection "awardsSharePlayers" \
  "awardId.string(),yearId.int32(),lgId.string(),
   playerId.string(),pointsWon.double(),pointsMax.double(),
   votesFirst.double()" \
  "./clones/${MONGOBALL_DB}/core/AwardsSharePlayers-noheader.csv"

importCollection "batting" \
  "playerId.string(),yearId.int32(),stint.int32(),
   teamId.string(),lgId.string(),games.int32(),
   atBats.int32(),runs.int32(),hits.int32(),
   doubles.int32(),triples.int32(),homeRuns.int32(),
   rbi.int32(),stolenBases.int32(),caughtStealing.int32(),
   baseOnBalls.int32(),strikeouts.int32(),intentionalWalks.int32(),
   hitByPitch.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),
   groundedIntoDoublePlays.int32()" \
  "./clones/${MONGOBALL_DB}/core/Batting-noheader.csv"

importCollection "battingPost" \
  "yearId.int32(),round.string(),playerId.string(),
   teamId.string(),lgId.string(),games.int32(),
   atBats.int32(),runs.int32(),hits.int32(),
   doubles.int32(),triples.int32(),homeRuns.int32(),
   rbi.int32(),stolenBases.int32(),caughtStealing.int32(),
   baseOnBalls.int32(),strikeouts.int32(),intentionalWalks.int32(),
   hitByPitch.int32(),sacrificeHits.int32(),sacrificeFlies.int32(),
   groundedIntoDoublePlays.int32()" \
  "./clones/${MONGOBALL_DB}/core/BattingPost-noheader.csv"

importCollection "collegePlaying" \
  "playerId.string(),schoolId.string(),yearId.int32()" \
  "./clones/${MONGOBALL_DB}/core/CollegePlaying-noheader.csv"

importCollection "fielding" \
  "playerId.string(),yearId.int32(),stint.int32(),
   teamId.string(),lgId.string(),position.string(),
   games.int32(),gamesStarted.int32(),innOuts.int32(),
   putOuts.int32(),assists.int32(),errors.int32(),
   doublePlays.int32(),passedBalls.int32(),wildPitches.int32(),
   stolenBases.int32(),caughtStealing.int32(),zoneRating.int32()" \
  "./clones/${MONGOBALL_DB}/core/Fielding-noheader.csv"

importCollection "fieldingOF" \
  "playerId.string(),yearId.int32(),stint.int32(),
   gamesLf.int32(),gamesCf.int32(),gamesRf.int32()" \
  "./clones/${MONGOBALL_DB}/core/FieldingOF-noheader.csv"

importCollection "fieldingOFsplit" \
  "playerId.string(),yearId.int32(),stint.int32(),
   teamId.string(),lgId.string(),position.string(),
   games.int32(),gamesStarted.int32(),innOuts.int32(),
   putOuts.int32(),assists.int32(),errors.int32(),
   doublePlays.int32(),passedBalls.int32(),wildPitches.int32(),
   stolenBases.int32(),caughtStealing.int32(),zoneRating.int32()" \
  "./clones/${MONGOBALL_DB}/core/FieldingOFsplit-noheader.csv"

importCollection "fieldingPost" \
  "playerId.string(),yearId.int32(),teamId.string(),
   lgId.string(),round.string(),position.string(),
   games.int32(),gamesStarted.int32(),innOuts.int32(),
   putOuts.int32(),assists.int32(),errors.int32(),
   doublePlays.int32(),triplePlays.int32(),passedBalls.int32(),
   stolenBases.int32(),caughtStealing.int32()" \
  "./clones/${MONGOBALL_DB}/core/FieldingPost-noheader.csv"

importCollection "hallOfFame" \
  "playerId.string(),yearId.int32(),votedBy.string(),
   ballots.int32(),needed.int32(),votes.int32(),
   inducted.string(),category.string(),needed_note.string()" \
  "./clones/${MONGOBALL_DB}/core/HallOfFame-noheader.csv"

importCollection "homeGames" \
  "yearId.int32(),lgId.string(),teamId.string(),
   parkId.string(),firstDate.date(2006-01-02),lastDate.date(2006-01-02),
   games.int32(),openings.int32(),attendance.int32()" \
  "./clones/${MONGOBALL_DB}/core/HomeGames-noheader.csv"

importCollection "managers" \
  "playerId.string(),yearId.int32(),teamId.string(),
   lgId.string(),inseason.int32(),games.int32(),
   wins.int32(),losses.int32(),rank.int32(),
   playerManager.string()" \
  "./clones/${MONGOBALL_DB}/core/Managers-noheader.csv"

importCollection "managersHalf" \
  "playerId.string(),yearId.int32(),teamId.string(),
   lgId.string(),inseason.int32(),half.int32(),
   games.int32(),wins.int32(),losses.int32(),rank.int32()" \
  "./clones/${MONGOBALL_DB}/core/ManagersHalf-noheader.csv"

importCollection "parks" \
  "parkId.string(),parkName.string(),parkAlias.string(),
   city.string(),state.string(),country.string()" \
  "./clones/${MONGOBALL_DB}/core/Parks-noheader.csv"

importCollection "people" \
   "playerId.string(),birthYear.int32(),birthMonth.int32(),
    birthDay.int32(),birthCountry.string(),birthState.string(),
    birthCity.string(),deathYear.int32(),deathMonth.int32(),
    deathDay.int32(),deathCountry.string(),deathState.string(),
    deathCity.string(),nameFirst.string(),nameLast.string(),
    nameGiven.string(),weight.int32(),height.int32(),
    bats.string(),throws.string(),debut.date(2006-01-02),
    finalGame.date(2006-01-02),retroId.string(),bbrefId.string()" \
   "./clones/${MONGOBALL_DB}/core/People-noheader.csv"

importCollection "pitching" \
  "playerId.string(),yearId.int32(),stint.int32(),
   teamId.string(),lgId.string(),wins.int32(),
   losses.int32(),games.int32(),gamesStarted.int32(),
   completeGames.int32(),shutouts.int32(),saves.int32(),
   ipOuts.int32(),hits.int32(),earnedRuns.int32(),
   homeRuns.int32(),baseOnBalls.int32(),strikeouts.int32(),
   oppBattingAvg.double(),era.double(),intentionalWalks.int32(),
   wildPitches.int32(),hitByPitch.double(),balks.int32(),
   battersFaced.int32(),gamesFinished.int32(),runs.int32(),
   sacrificeHits.int32(),sacrificeFlies.int32(),
   groundedIntoDoublePlays.int32()" \
  "./clones/${MONGOBALL_DB}/core/Pitching-noheader.csv"

importCollection "pitchingPost" \
  "playerId.string(),yearId.int32(),round.string(),
   teamId.string(),lgId.string(),wins.int32(),
   losses.int32(),games.int32(),gamesStarted.int32(),
   completeGames.int32(),shutouts.int32(),saves.int32(),
   ipOuts.int32(),hits.int32(),earnedRuns.int32(),
   homeRuns.int32(),baseOnBalls.int32(),strikeouts.int32(),
   oppBattingAvg.double(),era.double(),intentionalWalks.int32(),
   wildPitches.int32(),hitByPitch.double(),balks.int32(),
   battersFaced.int32(),gamesFinished.int32(),runs.int32(),
   sacrificeHits.int32(),sacrificeFlies.int32(),
   groundedIntoDoublePlays.int32()" \
  "./clones/${MONGOBALL_DB}/core/PitchingPost-noheader.csv"

importCollection "salaries" \
  "yearId.int32(),teamId.string(),lgId.string(),
   playerId.string(),salary.int32()" \
  "./clones/${MONGOBALL_DB}/core/Salaries-noheader.csv"

importCollection "schools" \
  "schoolId.string(),name.string(),city.string(),
   state.string(),country.string()" \
  "./clones/${MONGOBALL_DB}/core/Schools-noheader.csv"

importCollection "seriesPost" \
  "yearId.int32(),round.string(),teamIdWinner.string(),
   lgIdWinner.string(),teamIdLoser.string(),lgIdLoser.string(),
   wins.int32(),losses.int32(),ties.int32()" \
  "./clones/${MONGOBALL_DB}/core/SeriesPost-noheader.csv"

importCollection "teams" \
  "yearId.int32(),lgId.string(),teamId.string(),
   franchId.string(),divId.string(),rank.int32(),
   games.int32(),gamesHome.int32(),wins.int32(),
   losses.int32(),divWinner.string(),wildCardWinner.string(),
   leagueWinner.string(),worldSeriesWinner.string(),runs.int32(),
   atBats.int32(),hits.int32(),doubles.int32(),
   triples.int32(),homeRuns.int32(),baseOnBalls.double(),
   strikeouts.int32(),stolenBases.double(),caughtStealing.double(),
   hitByPitch.double(),sacrificeFlies.int32(),runsAllowed.int32(),
   earnedRunsAllowed.int32(),era.double(),completeGames.int32(),
   shutouts.int32(),saves.int32(),ipOuts.int32(),
   hitsAllowed.int32(),homeRunsAllowed.int32(),baseOnBallsAllowed.int32(),
   strikeoutsAllowed.int32(),errors.int32(),doublePlays.int32(),
   fieldingPercentage.double(),name.string(),park.string(),
   attendance.int32(),batterParkFactor.int32(),pitcherParkFactor.int32(),
   teamIdBr.string(),teamIdLahman45.string(),teamIdRetro.string()" \
  "./clones/${MONGOBALL_DB}/core/Teams-noheader.csv"

importCollection "teamsFranchises" \
  "franchiseId.string(),name.string(),active.string(),natAssocId.string()" \
  "./clones/${MONGOBALL_DB}/core/TeamsFranchises-noheader.csv"

importCollection "teamsHalf" \
  "yearId.int32(),lgId.string(),teamId.string(),
   half.int32(),divId.string(),divWinner.string(),
   rank.int32(),games.int32(),wins.int32(),losses.int32()" \
  "./clones/${MONGOBALL_DB}/core/TeamsHalf-noheader.csv"

# Find child processes and wait for them to finish so this script doesn't
# exit before the children do (otherwise our trap will kill them)
for job in $(jobs -p); do
    wait $job
done
