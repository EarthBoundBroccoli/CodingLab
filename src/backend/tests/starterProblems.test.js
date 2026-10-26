import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { starterProblems } from '../data/starterProblems.js';
import { Problem } from '../models/Problem.js';
import { wrapPython, createRuntimeMarker } from '../utils/judgingRuntime.js';

const references = [
    'a,b=map(int,input().split())\nprint("Odd" if a%2 and b%2 else "Even")',
    'n,target=map(int,input().split())\na=list(map(int,input().split()))\nassert len(a)==n\nseen={}\npairs=[]\nfor j,v in enumerate(a):\n    for i in seen.get(target-v,[]):\n        pairs.append((i,j))\n    seen.setdefault(v,[]).append(j)\nassert len(pairs)==1\nprint(*pairs[0])',
    'n=int(input())\na=list(map(int,input().split()))\nassert len(a)==n-1 and len(set(a))==len(a)\nmissing=set(range(1,n+1))-set(a)\nassert len(missing)==1\nprint(missing.pop())',
    'from itertools import groupby\ns=input()\nassert s and set(s)<=set("ACGT")\nprint(max(sum(1 for _ in group) for _,group in groupby(s)))',
];

for (const [index, problem] of starterProblems.entries()) {
    test(`starter problem validates and passes real batched input: ${problem.title}`, async () => {
        await new Problem({ ...problem, setterId:'test-owner', status:'approved' }).validate();
        const inputs = [...problem.samples.map(s=>s.input), ...problem.hiddenInput.split('\n///\n')];
        const outputs = [...problem.samples.map(s=>s.output), ...problem.hiddenOutput.split('\n///\n')];
        assert.equal(inputs.length, outputs.length);
        const result = spawnSync('python', ['-c',wrapPython(references[index], createRuntimeMarker())], {
            input:inputs.join('\n///\n'), encoding:'utf8', timeout:15000, windowsHide:true,
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(result.stdout.trim().split(/\r?\n\/\/\/\r?\n/).map(s=>s.trim()), outputs);
    });
}
