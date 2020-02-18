import sys
import json
from collections import defaultdict

input_file = sys.argv[1]
output_file = sys.argv[2]

registered_voters_by_precinct = {}
ballots_cast_by_precinct = {}
results_by_precinct_and_candidate = defaultdict(dict)

f = open(input_file, 'r')
for line in f:
    enc = line[0:26]
    contest = line[26:82].strip()
    candidate = line[82:120].strip()
    precinct = line[120:150].strip()
    level = line[150:175].strip()
    voting_method = line[175:205].strip()
    precinct_num = enc[7:11]
    # print(enc)
    # print(contest)
    # print(candidate)
    # print(precinct, precinct_num)
    # print(level)
    # print(voting_method)
    value = int(enc[11:16])
    if contest == 'REGISTERED VOTERS - TOTAL':
        registered_voters_by_precinct[precinct_num] = value
    if contest == 'BALLOTS CAST - TOTAL':
        if precinct_num in ballots_cast_by_precinct:
            ballots_cast_by_precinct[precinct_num] += value
        else:
            ballots_cast_by_precinct[precinct_num] = value
    if contest == 'President' and enc[16:19] == 'DEM':
        if candidate in results_by_precinct_and_candidate[precinct_num]:
            results_by_precinct_and_candidate[precinct_num][candidate] += value
        else:
            results_by_precinct_and_candidate[precinct_num][candidate] = value

# for p in registered_voters_by_precinct:
#     if p not in ballots_cast_by_precinct:
#         print('missing')
#     if registered_voters_by_precinct[p] < ballots_cast_by_precinct[p]:
#         print('overvote')
#
# for p in ballots_cast_by_precinct:
#    if p not in registered_voters_by_precinct:
#        print('missing')

precinct_data = {}
for p in registered_voters_by_precinct:
    precinct_data[p] = {
        'total_voters': registered_voters_by_precinct[p],
        'ballots_cast': ballots_cast_by_precinct[p],
        'dem_primary': {},
    }
    for candidate in results_by_precinct_and_candidate[p]:
        precinct_data[p]['dem_primary'][candidate] = results_by_precinct_and_candidate[p][candidate]


f = open(output_file, 'w')
precinct_json = json.dumps(precinct_data)
f.write(precinct_json)
f.close()
