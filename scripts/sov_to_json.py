import sys
import json
from collections import defaultdict

input_file = sys.argv[1]
output_file = sys.argv[2]

registered_voters_by_precinct = {}
ballots_cast_by_precinct = {}
# { precinct : { contest: { candidate: votes }}}
results = defaultdict(lambda: defaultdict(dict))

PARTISAN_CONTEST_PREFIXES = ['President']
NONPARTISAN_CONTEST_PREFIXES = [
    'U.S. Senator',
    'U.S. Representative',
    'State Proposition',
    'Local Measure',
    'District Measure',
]
INVALID_CANDIDATES = [
    'Under Vote',
    'Over Vote',
]
VALID_PARTIES = [
    'DEM',
    'REP',
]

f = open(input_file, 'r')
for line in f:
    enc = line[0:26]
    contest = line[26:82].strip()
    candidate = line[82:120].strip()
    precinct = line[120:150].strip()
    level = line[150:175].strip()
    voting_method = line[175:205].strip()
    precinct_num = enc[7:11]
    value = int(enc[11:16])
    party = enc[16:19].strip()
    include_contest = False
    if any([contest.startswith(p) for p in PARTISAN_CONTEST_PREFIXES]):
        if party in VALID_PARTIES:
            include_contest = True
            contest = contest + ' - ' + party
    elif any([contest.startswith(p) for p in NONPARTISAN_CONTEST_PREFIXES]):
        include_contest = True
    # print(enc)
    # print(contest)
    # print(candidate)
    # print(precinct, precinct_num)
    # print(level)
    # print(voting_method)
    if contest == 'REGISTERED VOTERS - TOTAL':
        registered_voters_by_precinct[precinct_num] = value
    elif contest == 'BALLOTS CAST - TOTAL':
        if precinct_num in ballots_cast_by_precinct:
            ballots_cast_by_precinct[precinct_num] += value
        else:
            ballots_cast_by_precinct[precinct_num] = value
    elif include_contest:
        if candidate not in INVALID_CANDIDATES:
            if candidate in results[precinct_num][contest]:
                results[precinct_num][contest][candidate] += value
            else:
                results[precinct_num][contest][candidate] = value

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
        **results[p],
    }

f = open(output_file, 'w')
precinct_json = json.dumps(precinct_data)
f.write(precinct_json)
f.close()
