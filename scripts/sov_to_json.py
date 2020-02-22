import sys
import json
from collections import defaultdict

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

input_file = sys.argv[1]
output_file = sys.argv[2]

f = open(input_file, 'r')

# { precinct: { registeredVoters, ballotsCast, contest: { candidate: votes }}}
precinct_data = defaultdict(lambda: defaultdict(dict))

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
        precinct_data[precinct_num]['registeredVoters'] = value
    elif contest == 'BALLOTS CAST - TOTAL':
        if 'ballotsCast' in precinct_data[precinct_num]:
            precinct_data[precinct_num]['ballotsCast'] += value
        else:
            precinct_data[precinct_num]['ballotsCast'] = value
    elif include_contest:
        if candidate not in INVALID_CANDIDATES:
            if candidate in precinct_data[precinct_num][contest]:
                precinct_data[precinct_num][contest][candidate] += value
            else:
                precinct_data[precinct_num][contest][candidate] = value

# for p in registered_voters_by_precinct:
#     if p not in ballots_cast_by_precinct:
#         print('missing')
#     if registered_voters_by_precinct[p] < ballots_cast_by_precinct[p]:
#         print('overvote')
#
# for p in ballots_cast_by_precinct:
#    if p not in registered_voters_by_precinct:
#        print('missing')

f = open(output_file, 'w')
precinct_json = json.dumps(precinct_data)
f.write(precinct_json)
f.close()
