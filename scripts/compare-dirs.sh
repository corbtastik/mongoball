#!/bin/bash
# compare-dirs.sh - Compare source data between two directories

DIR1="${1:-/Users/corbs/dev/github/corbtastik/retrosheet}"
DIR2="${2:-/Users/corbs/dev/github/corbtastik/retrosheet-test}"

get_stats() {
  local dir="$1"
  local file="$2"
  local path="$dir/$file"

  if [[ -f "$path" ]]; then
    lines=$(wc -l < "$path" | tr -d ' ')
    size=$(ls -lh "$path" | awk '{print $5}')
    echo "$lines|$size"
  else
    echo "-|-"
  fi
}

count_files() {
  local dir="$1"
  local pattern="$2"
  ls -1 "$dir"/$pattern 2>/dev/null | wc -l | tr -d ' '
}

echo ""
echo "====================================================================================================="
echo "                              SIDE-BY-SIDE DATA COMPARISON"
echo "====================================================================================================="
echo ""
echo "DIR1: $DIR1"
echo "DIR2: $DIR2"
echo ""

printf "%-35s | %15s %10s | %15s %10s | %s\n" "File" "Lines (DIR1)" "Size" "Lines (DIR2)" "Size" "Match"
printf "%-35s-|-%15s-%10s-|-%15s-%10s-|-%s\n" "-----------------------------------" "---------------" "----------" "---------------" "----------" "-----"

# Function to compare and print row
compare_file() {
  local file="$1"
  local desc="$2"

  IFS='|' read -r lines1 size1 <<< "$(get_stats "$DIR1" "$file")"
  IFS='|' read -r lines2 size2 <<< "$(get_stats "$DIR2" "$file")"

  if [[ "$lines1" == "$lines2" ]]; then
    match="✓"
  else
    match="✗"
  fi

  printf "%-35s | %15s %10s | %15s %10s | %s\n" "$desc" "$lines1" "$size1" "$lines2" "$size2" "$match"
}

echo ""
echo "--- STATCAST ---"
compare_file "2023_statcast.csv" "2023_statcast.csv"

echo ""
echo "--- RETROSHEET GAME LOGS ---"
compare_file "gl2023.txt" "gl2023.txt"

echo ""
echo "--- RETROSHEET BOX SCORES ---"
compare_file "2023.EBA" "2023.EBA (AL)"
compare_file "2023.EBN" "2023.EBN (NL)"

echo ""
echo "--- RETROSHEET DAILY STATS ---"
compare_file "2023batting.csv" "2023batting.csv"
compare_file "2023pitching.csv" "2023pitching.csv"
compare_file "2023fielding.csv" "2023fielding.csv"
compare_file "2023plays.csv" "2023plays.csv"
compare_file "2023gameinfo.csv" "2023gameinfo.csv"
compare_file "2023teamstats.csv" "2023teamstats.csv"
compare_file "2023allplayers.csv" "2023allplayers.csv"
compare_file "2023schedule.csv" "2023schedule.csv"

echo ""
echo "--- REFERENCE DATA ---"
compare_file "chadwick_register.csv" "chadwick_register.csv"
compare_file "biofile0.csv" "biofile0.csv"
compare_file "ejections.csv" "ejections.csv"
compare_file "ballparks0.csv" "ballparks0.csv"
compare_file "coaches0.csv" "coaches0.csv"
compare_file "managers0.csv" "managers0.csv"
compare_file "umpires0.csv" "umpires0.csv"
compare_file "teams0.csv" "teams0.csv"
compare_file "relatives.csv" "relatives.csv"

echo ""
echo "--- FILE COUNTS ---"
printf "%-35s | %15s %10s | %15s %10s | %s\n" "Category" "Count (DIR1)" "" "Count (DIR2)" "" "Match"
printf "%-35s-|-%15s-%10s-|-%15s-%10s-|-%s\n" "-----------------------------------" "---------------" "----------" "---------------" "----------" "-----"

eva1=$(count_files "$DIR1" "2023*.EVA")
eva2=$(count_files "$DIR2" "2023*.EVA")
[[ "$eva1" == "$eva2" ]] && m="✓" || m="✗"
printf "%-35s | %15s %10s | %15s %10s | %s\n" "Event Files (AL - .EVA)" "$eva1" "" "$eva2" "" "$m"

evn1=$(count_files "$DIR1" "2023*.EVN")
evn2=$(count_files "$DIR2" "2023*.EVN")
[[ "$evn1" == "$evn2" ]] && m="✓" || m="✗"
printf "%-35s | %15s %10s | %15s %10s | %s\n" "Event Files (NL - .EVN)" "$evn1" "" "$evn2" "" "$m"

eve1=$(count_files "$DIR1" "2023*.EVE")
eve2=$(count_files "$DIR2" "2023*.EVE")
[[ "$eve1" == "$eve2" ]] && m="✓" || m="✗"
printf "%-35s | %15s %10s | %15s %10s | %s\n" "Postseason Files (.EVE)" "$eve1" "" "$eve2" "" "$m"

ros1=$(count_files "$DIR1" "*2023.ROS")
ros2=$(count_files "$DIR2" "*2023.ROS")
[[ "$ros1" == "$ros2" ]] && m="✓" || m="✗"
printf "%-35s | %15s %10s | %15s %10s | %s\n" "Roster Files (.ROS)" "$ros1" "" "$ros2" "" "$m"

echo ""
echo "====================================================================================================="
