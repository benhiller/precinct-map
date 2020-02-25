# Used for 2016 general election results

import sys
import json
from collections import defaultdict

input_file = sys.argv[1]
output_file = sys.argv[2]

f = open(input_file, 'r')

# { precinct: { registeredVoters, ballotsCast, contest: { candidate: votes }}}
precinct_data = defaultdict(lambda: defaultdict(dict))
contests = []

contest = None
contest_line = 0
candidates = None
for idx, line in enumerate(f):
    columns = line.split('\t')
    if columns[0].startswith('***'):
        contest = columns[0][4:].strip()
        contests.append(contest)
        contest_line = idx

    if idx == contest_line + 2:
        candidates = columns[7:len(columns) - 2]

    valid_row = contest is not None
    valid_row = valid_row and idx > contest_line + 2
    valid_row = valid_row and len(columns) > 2
    valid_row = valid_row and columns[0].startswith('Pct')

    if valid_row:
        precinct_num = columns[2]
        precinct_name = columns[0]

        second_precinct = None
        if '/' in precinct_name:
            second_precinct = precinct_name.split('/')[1]

        for idx, candidate in enumerate(candidates):
            if candidate not in precinct_data[precinct_num][contest]:
                precinct_data[precinct_num][contest][candidate] = int(columns[idx + 7])
            else:
                precinct_data[precinct_num][contest][candidate] += int(columns[idx + 7])

        # Add total voter data based on the first contest only
        if len(contests) == 1:
            if 'ballotsCast' not in precinct_data[precinct_num]:
                precinct_data[precinct_num]['ballotsCast'] = int(columns[5])
            else:
                precinct_data[precinct_num]['ballotsCast'] += int(columns[5])

            if columns[1] == 'VBM':
                if 'registeredVoters' not in precinct_data[precinct_num]:
                    precinct_data[precinct_num]['registeredVoters'] = int(columns[4])
                else:
                    precinct_data[precinct_num]['registeredVoters'] += int(columns[4])

        if second_precinct:
            precinct_data[second_precinct] = precinct_data[precinct_num]

f = open(output_file, 'w')
precinct_json = json.dumps({
    'contests': contests,
    'precinct_data': precinct_data,
})
f.write(precinct_json)
f.close()
